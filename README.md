# SurveySensum AI - Synthetic Survey Response Generator

An advanced, hybrid persona-driven synthetic data generator that creates realistic, coherent, and high-fidelity survey responses. 

* **Live Demo**: [https://surveysensum.vercel.app](https://surveysensum.vercel.app)
* **API Endpoint**: `POST /api/generate` (FastAPI backend running on Vercel)

---

## 📄 Assignment Write-up

### 1. Our Approach & Why We Chose It
To build a generator that is **plausible**, **coherent**, and **cost-effective**, we chose a **Hybrid Persona-Driven Statistical & LLM Architecture**:

1. **Persona-Driven Statistical Engine (Structured Data)**:
   * Instead of passing every response generation to a slow and expensive LLM, we generate the structured answers (ratings, NPS, single-choice fields) using a statistical engine.
   * When a request for $N$ responses is made, we partition the population into 4 distinct customer archetypes: **Promoter**, **Passive**, **Detractor**, and **Mixed**.
   * Each archetype has its own probability distribution. For example, a *Detractor* is highly likely to rate satisfaction as 1 or 2, NPS as 0–6, and has a higher probability of experiencing late delivery.
   * This persona model guarantees **perfect numerical coherence** (e.g. strong satisfaction-NPS correlation with Pearson $r > 0.70$) without any API costs or latency.

2. **Context-Aware Batch LLM (Open-text Feedback)**:
   * To generate natural human comments, we pass the structured respondent profiles (archetype, rating, NPS, delivery status) to the **Cohere Command-R** model.
   * To satisfy the $2 budget limit and prevent API rate limiting, we **batch-generate comments in chunks of 50 profiles** in parallel using Python's `ThreadPoolExecutor`.
   * The LLM is prompted to draft feedback matching their specific ratings (e.g. complaining about shipping delays only if delivery was marked late/No).
   * **Robust Safety Net**: We enforced a strict `8.0` second execution timeout on the threadpool. If Cohere fails or hangs, the pipeline automatically falls back to statistical local templates, ensuring the serverless endpoint never times out (504).

---

### 2. How to Measure if the Outputs are Good

We evaluate the quality of our synthetic responses using four metrics:

* **Correlation Consistency (Coherence)**: We compute the Pearson correlation coefficient ($r$) between the Satisfaction rating (1–5) and NPS score (0–10). A successful batch must demonstrate $r \ge 0.70$, mirroring real-world customer behavior.
* **Semantic Alignment (Plausibility)**: Using a lightweight sentiment classifier, we check if the sentiment of the generated open-text comments matches the numerical NPS score (e.g. negative sentiment for Detractors, positive for Promoters).
* **Delivery Conditional Probability**: We verify that respondents who comment about "shipping" or "late delivery" have a high correlation with the `delivery_on_time = No` variable.
* **Chi-Squared Distribution Fit**: We compare the category purchase counts against our configured weights to ensure the generator does not skew or over-represent any option.

---

### 3. What We'd Do Differently with More Time

With more time, we would implement the following enhancements:

* **Local WebGPU Inference (Zero API cost)**: Integrate a lightweight model (e.g., Llama-3-8B via WebLLM or Transformers.js) running client-side using WebGPU. This would remove all server latency, external API dependencies, and API costs entirely.
* **Interactive Persona Weighting**: Add sliders in the UI so users can dynamically customize the percentage of Promoters/Detractors, delivery delay rates, or product categories to simulate different market scenarios.
* **Interactive Evaluation Dashboard**: Build a visual dashboard directly in the UI that displays the Pearson correlation, token usage, and sentiment alignment score for every generated batch.

### 4. Known Limitations

* **Survey Structure Assumptions**: The statistical engine assumes the first `rating` type question uses a 1–5 scale and appears before the NPS question. If a survey has a 1–10 rating before NPS, values 6–10 will be skipped during the correlation lookup in `statistical.py` (line 35: `if isinstance(val, int) and val <= 5`), causing a fallback to the persona mean. This works correctly for the provided e-commerce test case but would need to be generalized for arbitrary survey structures.

* **localStorage Transfer**: Generated responses are transferred to the results page via `localStorage`. In incognito/private browsing or contexts where storage is blocked, the user sees a redirect back to the editor with a toast notification. A query-parameter or sessionStorage fallback would be more robust.

---

## 🚀 Tech Stack

* **Frontend**: Next.js 16 (App Router, Turbopack, TailwindCSS, Recharts, Framer Motion)
* **Backend**: FastAPI (Python 3.12, Cohere V2 Client, ThreadPoolExecutor, Pydantic v2)
* **Hosting**: Vercel (Next.js server + Python serverless rewrites)

---

## ⚙️ Local Development

1. **Clone the repository and install dependencies**:
   ```bash
   pnpm install
   ```
2. **Set up Python Virtual Environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r api/requirements.txt
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root:
   ```env
   COHERE_API_KEY=your_cohere_api_key_here
   ```
4. **Run the development server**:
   ```bash
   pnpm dev
   ```
   * Next.js Frontend: `http://localhost:3000`
   * FastAPI docs: `http://localhost:3000/api/docs`
