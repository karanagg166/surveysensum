"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowUpDown, ChevronLeft, ChevronRight, Check, X, Search, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SurveyResponse, SurveyDefinition } from "@/lib/api";

const MotionTableRow = motion(TableRow);

interface ResponseTableProps {
  responses: SurveyResponse[];
  survey: SurveyDefinition;
}

type SortField = "id" | "satisfaction" | "nps" | "delivery";
type SortOrder = "asc" | "desc";

export default function ResponseTable({ responses, survey }: ResponseTableProps) {
  // Find question IDs
  const { sat_q, nps_q, delivery_q, category_q, text_q } = useMemo(() => {
    let sat_q = null, nps_q = null, delivery_q = null, category_q = null, text_q = null;
    
    for (const q of survey.questions) {
      if (q.type === "rating" && !sat_q) sat_q = q;
      else if (q.type === "nps" && !nps_q) nps_q = q;
      else if (q.type === "single_choice") {
        const idLower = q.id.toLowerCase();
        const textLower = q.text.toLowerCase();
        if (idLower.includes("delivery") || textLower.includes("delivery") || textLower.includes("on time") || textLower.includes("arrive")) {
          if (!delivery_q) delivery_q = q;
        } else if (idLower.includes("category") || textLower.includes("category") || textLower.includes("product type") || textLower.includes("department")) {
          if (!category_q) category_q = q;
        }
      } else if (q.type === "open_text" && !text_q) {
        text_q = q;
      }
    }
    return { sat_q, nps_q, delivery_q, category_q, text_q };
  }, [survey]);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [npsFilter, setNpsFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);

  // Helper to extract values
  const getSatVal = (r: SurveyResponse) => (sat_q ? r.answers[sat_q.id] || 0 : 0);
  const getNpsVal = (r: SurveyResponse) => (nps_q ? r.answers[nps_q.id] || 0 : 0);
  const getDeliveryVal = (r: SurveyResponse) => {
    if (!delivery_q) return "";
    const val = String(r.answers[delivery_q.id]).toLowerCase();
    return ["yes", "on time", "on-time", "true"].includes(val) ? "On Time" : "Late";
  };
  const getCategoryVal = (r: SurveyResponse) => (category_q ? r.answers[category_q.id] || "Other" : "Other");
  const getTextVal = (r: SurveyResponse) => (text_q ? r.answers[text_q.id] || "" : "");

  // NPS Group Helper
  const getNpsGroup = (score: number) => {
    if (score >= 9) return "promoter";
    if (score >= 7) return "passive";
    return "detractor";
  };

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      const satVal = getSatVal(r);
      const npsVal = getNpsVal(r);
      const deliveryVal = getDeliveryVal(r);
      const categoryVal = getCategoryVal(r);
      const textVal = getTextVal(r);

      // Search term (ID or open text)
      const matchesSearch =
        r.response_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        textVal.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = categoryFilter === "all" || categoryVal === categoryFilter;

      // NPS filter
      const matchesNps = npsFilter === "all" || getNpsGroup(npsVal) === npsFilter;

      // Delivery filter
      const matchesDelivery =
        deliveryFilter === "all" ||
        (deliveryFilter === "ontime" && deliveryVal === "On Time") ||
        (deliveryFilter === "late" && deliveryVal === "Late");

      return matchesSearch && matchesCategory && matchesNps && matchesDelivery;
    });
  }, [responses, searchTerm, categoryFilter, npsFilter, deliveryFilter, sat_q, nps_q, delivery_q, category_q, text_q]);

  // Sorted responses
  const sortedResponses = useMemo(() => {
    const sorted = [...filteredResponses];
    sorted.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "id") {
        valA = a.response_id;
        valB = b.response_id;
      } else if (sortField === "satisfaction") {
        valA = getSatVal(a);
        valB = getSatVal(b);
      } else if (sortField === "nps") {
        valA = getNpsVal(a);
        valB = getNpsVal(b);
      } else if (sortField === "delivery") {
        valA = getDeliveryVal(a);
        valB = getDeliveryVal(b);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredResponses, sortField, sortOrder]);

  // Paginated responses
  const paginatedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedResponses.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedResponses, currentPage]);

  const totalPages = Math.ceil(sortedResponses.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to descending for ratings/nps
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getNpsBadgeColor = (score: number) => {
    if (score >= 9) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 7) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="space-y-4" id="response-table-section">
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="table-search"
            placeholder="Search responses or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-white border-zinc-200"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => {
              setCategoryFilter(val ?? "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger id="table-filter-category" className="w-[140px] bg-white border-zinc-200 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Electronics">Electronics</SelectItem>
              <SelectItem value="Clothing">Clothing</SelectItem>
              <SelectItem value="Home">Home</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* NPS Filter */}
          <Select
            value={npsFilter}
            onValueChange={(val) => {
              setNpsFilter(val ?? "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger id="table-filter-nps" className="w-[140px] bg-white border-zinc-200 text-xs">
              <SelectValue placeholder="NPS Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="promoter">Promoters (9-10)</SelectItem>
              <SelectItem value="passive">Passives (7-8)</SelectItem>
              <SelectItem value="detractor">Detractors (0-6)</SelectItem>
            </SelectContent>
          </Select>

          {/* Delivery Filter */}
          <Select
            value={deliveryFilter}
            onValueChange={(val) => {
              setDeliveryFilter(val ?? "all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger id="table-filter-delivery" className="w-[140px] bg-white border-zinc-200 text-xs">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery</SelectItem>
              <SelectItem value="ontime">On Time</SelectItem>
              <SelectItem value="late">Late / Delayed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table id="survey-responses-table">
          <TableHeader className="bg-zinc-50/75">
            <TableRow>
              <TableHead className="w-[100px]">
                <button
                  id="sort-by-id"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase hover:text-zinc-900"
                  onClick={() => handleSort("id")}
                >
                  ID <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="w-[150px]">
                <button
                  id="sort-by-sat"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase hover:text-zinc-900"
                  onClick={() => handleSort("satisfaction")}
                >
                  CSAT <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="w-[100px]">
                <button
                  id="sort-by-nps"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase hover:text-zinc-900"
                  onClick={() => handleSort("nps")}
                >
                  NPS <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="w-[130px] text-zinc-500 text-xs font-semibold uppercase">Category</TableHead>
              <TableHead className="w-[120px]">
                <button
                  id="sort-by-delivery"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase hover:text-zinc-900"
                  onClick={() => handleSort("delivery")}
                >
                  Delivery <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-zinc-500 text-xs font-semibold uppercase">Customer Feedback</TableHead>
              <TableHead className="w-[80px] text-center text-zinc-500 text-xs font-semibold uppercase">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResponses.length > 0 ? (
              paginatedResponses.map((r, i) => {
                const satVal = getSatVal(r);
                const npsVal = getNpsVal(r);
                const deliveryVal = getDeliveryVal(r);
                const categoryVal = getCategoryVal(r);
                const textVal = getTextVal(r);

                return (
                  <MotionTableRow
                    key={`${currentPage}-${r.response_id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: (i % itemsPerPage) * 0.02 }}
                    className="hover:bg-zinc-50/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedResponse(r)}
                  >
                    <TableCell className="font-mono text-xs font-medium text-zinc-900">
                      {r.response_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-3.5 w-3.5 ${
                              idx < satVal ? "fill-current animate-pulse-subtle" : "text-zinc-150"
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-semibold font-mono px-2.5 py-0.5 rounded-full ${getNpsBadgeColor(npsVal)}`}>
                        {npsVal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {categoryVal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deliveryVal === "On Time" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check className="h-4 w-4 stroke-[3]" /> On Time
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                          <X className="h-4 w-4 stroke-[3]" /> Late
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 max-w-[200px] truncate">
                      {textVal || <span className="text-zinc-400 italic">No feedback comment</span>}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        id={`view-resp-${r.response_id}`}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                        onClick={() => setSelectedResponse(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </MotionTableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-400">
                  No generated responses match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" id="table-pagination-nav">
          <span className="text-xs text-zinc-500">
            Showing <span className="font-semibold text-zinc-900">{filteredResponses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-zinc-900">
              {Math.min(currentPage * itemsPerPage, filteredResponses.length)}
            </span>{" "}
            of <span className="font-semibold text-zinc-900">{filteredResponses.length}</span> responses
          </span>

          <div className="flex items-center gap-1">
            <Button
              id="pagination-prev"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              // Only display subset of pages if too many
              if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                if (page === 2 || page === totalPages - 1) {
                  return <span key={page} className="px-1 text-xs text-zinc-400">...</span>;
                }
                return null;
              }
              return (
                <Button
                  key={page}
                  id={`pagination-page-${page}`}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className={`h-8 w-8 p-0 border-zinc-200 ${
                    currentPage === page
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              id="pagination-next"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Feedback Dialog */}
      <Dialog open={selectedResponse !== null} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 rounded-xl" id="response-details-modal">
          {selectedResponse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-zinc-900 flex items-center gap-2">
                  Respondent Profile: <span className="font-mono text-sm font-semibold">{selectedResponse.response_id}</span>
                </DialogTitle>
                <DialogDescription>
                  Detailed metrics and synthesized comment.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <div>
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold">CSAT Rating</span>
                    <div className="flex items-center text-amber-400 mt-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-3.5 w-3.5 ${
                            idx < getSatVal(selectedResponse) ? "fill-current" : "text-zinc-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold">NPS Score</span>
                    <Badge className={`mt-0.5 font-semibold font-mono ${getNpsBadgeColor(getNpsVal(selectedResponse))}`}>
                      {getNpsVal(selectedResponse)} / 10
                    </Badge>
                  </div>

                  <div>
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Product Category</span>
                    <span className="block mt-0.5 text-sm font-semibold text-zinc-800">
                      {getCategoryVal(selectedResponse)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Delivery Status</span>
                    {getDeliveryVal(selectedResponse) === "On Time" ? (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-semibold text-emerald-600">
                        <Check className="h-4 w-4 stroke-[3]" /> On Time
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-semibold text-rose-600">
                        <X className="h-4 w-4 stroke-[3]" /> Late
                      </span>
                    )}
                  </div>
                </div>

                {/* Feedback text */}
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">Synthesized Comment</span>
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 text-sm text-zinc-700 italic shadow-inner">
                    "{getTextVal(selectedResponse) || "No feedback comment provided"}"
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  id="close-dialog-btn"
                  variant="outline"
                  onClick={() => setSelectedResponse(null)}
                  className="border-zinc-200 text-zinc-700"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
