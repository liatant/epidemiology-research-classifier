/* Epidemiology Research Aim Classifier - browser-only rule engine
   Version: 2026-05-25-fix1
   This file intentionally uses simple phrase/regex matching instead of one large regex.
*/

const LABELS = ["Descriptive", "Analytic", "Predictive", "Prescriptive"];
const PRIORITY = ["Prescriptive", "Predictive", "Analytic", "Descriptive"];

const RULES = {
  Prescriptive: {
    weight: 4,
    cues: [
      "should", "recommend", "recommendation", "which intervention", "which strategy", "which treatment",
      "which policy", "which patients should", "who should", "what should", "how should",
      "decision support", "decision rule", "action rule", "action threshold", "treatment recommendation",
      "intervention recommendation", "policy optimization", "policy optimisation", "policy simulation",
      "intervention optimization", "intervention optimisation", "prioritize", "prioritise", "allocate",
      "allocation", "target", "optimal strategy", "optimized action", "optimised action", "reinforcement"
    ],
    regexes: [
      /\bwhich\s+(intervention|strategy|treatment|policy|patients|groups|screening|outreach|program|option)\b/i,
      /\b(choose|select|prioriti[sz]e|allocat(e|ion)|target)\b.*\b(intervention|policy|treatment|screening|outreach|patients|resources)\b/i,
      /\b(cost[- ]effectiveness|decision analysis|decision support|decision rule|policy simulation|action rule)\b/i
    ]
  },
  Predictive: {
    weight: 3,
    cues: [
      "predict", "prediction", "predictive", "forecast", "forecasting", "classification", "classify",
      "risk prediction", "risk score", "risk model", "prediction model", "prediction score",
      "outcome prediction", "predicted probability", "predicted probabilities", "individual risk",
      "model performance", "model validation", "external validation", "auc", "area under the curve",
      "calibration", "discrimination", "machine learning", "training set", "testing set",
      "validation split", "future risk", "future outcome", "future burden", "future incidence", "future prevalence", "next season", "next winter", "next year"
    ],
    regexes: [
      /\b(can|could|will|does|do)\b.*\b(predict|forecast|classify)\b/i,
      /\b(develop|validate|train|test|compare)\b.*\b(model|algorithm|classifier|risk score|prediction tool)\b/i,
      /\b(30[- ]day|90[- ]day|one[- ]year|5[- ]year|five[- ]year)\b.*\b(risk|hospitali[sz]ation|mortality|readmission|outcome)\b/i
    ]
  },
  Analytic: {
    weight: 2,
    cues: [
      "association", "associated with", "relationship between", "exposure-outcome", "exposure outcome",
      "causal", "causal inference", "risk factor", "risk factors", "determinant", "determinants",
      "predictors of", "hypothesis test", "hypothesis testing", "odds ratio", "risk ratio",
      "relative risk", "hazard ratio", "adjusted association", "adjusted effect", "adjusted odds",
      "adjusted risk", "adjusted hazard", "regression", "stratification", "adjustment",
      "causal modeling", "causal modelling", "effect of", "impact of", "effectiveness of"
    ],
    regexes: [
      /\b(is|are|was|were)\b.*\b(associated with|related to|linked to)\b/i,
      /\bdoes\b.*\b(affect|increase|decrease|reduce|cause)\b/i,
      /\b(effect|impact)\s+of\b/i
    ]
  },
  Descriptive: {
    weight: 1,
    cues: [
      "prevalence", "incidence", "rate", "rates", "burden", "distribution", "distributions",
      "surveillance", "trend", "trends", "population characterization", "population characterisation",
      "characteristics", "describe", "describing", "percentage", "percentages", "proportion",
      "mean", "means", "cross-tabulation", "cross tabulation", "weighted prevalence",
      "descriptive summary", "demographic profile", "how many", "how common"
    ],
    regexes: [
      /\bwhat\s+(is|are|was|were)\s+the\s+(prevalence|incidence|rate|rates|burden|distribution|trend|characteristics)\b/i,
      /\bwhat\s+(proportion|percentage)\b/i,
      /\bhow\s+(many|common)\b/i
    ]
  }
};

function normalize(text) {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreQuestion(question) {
  const original = question || "";
  const text = normalize(original);
  const scores = { Descriptive: 0, Analytic: 0, Predictive: 0, Prescriptive: 0 };
  const hits = { Descriptive: [], Analytic: [], Predictive: [], Prescriptive: [] };

  for (const label of LABELS) {
    const rule = RULES[label];
    for (const cue of rule.cues) {
      if (text.includes(cue.toLowerCase())) {
        scores[label] += rule.weight;
        hits[label].push(cue);
      }
    }
    for (const rx of rule.regexes) {
      if (rx.test(original)) {
        scores[label] += rule.weight + 1;
        hits[label].push(rx.toString());
      }
    }
  }
  return { scores, hits };
}

function chooseClassification(scores) {
  const max = Math.max(...Object.values(scores));
  if (max === 0) return "Descriptive";
  const candidates = LABELS.filter(label => scores[label] === max);
  for (const label of PRIORITY) {
    if (candidates.includes(label)) return label;
  }
  return candidates[0];
}

function classify(question) {
  const q = (question || "").trim();
  if (!q) return null;

  const { scores, hits } = scoreQuestion(q);
  const classification = chooseClassification(scores);
  const maxScore = scores[classification];
  const positiveClasses = LABELS.filter(label => scores[label] > 0);

  let confidence = "High";
  if (maxScore === 0) confidence = "Low";
  else if (positiveClasses.length > 1) confidence = "Medium";
  else if (maxScore <= RULES[classification].weight) confidence = "Medium";

  const cueText = hits[classification].slice(0, 3).join(", ");
  let reason;
  if (classification === "Prescriptive") {
    reason = "The question is action-oriented: it asks what should be recommended, selected, targeted, optimized, prioritized, or allocated.";
  } else if (classification === "Predictive") {
    reason = "The question focuses on forecasting, risk prediction, classification, model development/validation, model performance, or future outcome estimation.";
  } else if (classification === "Analytic") {
    reason = "The question focuses on association estimation, exposure-outcome relationships, causal effects, risk factors, adjusted estimates, or hypothesis testing.";
  } else if (maxScore > 0) {
    reason = "The question focuses on estimating or describing prevalence, incidence, rates, burden, distributions, surveillance patterns, trends, or population characteristics.";
  } else {
    reason = "No strong analytic, predictive, or prescriptive cues were detected. The tool defaulted to Descriptive with low confidence; human review is recommended.";
  }

  if (cueText) reason += ` Detected cue(s): ${cueText}.`;
  if (positiveClasses.length > 1) {
    reason += " Multiple category cues were present, so the final-purpose and priority rules were applied.";
  }

  return { classification, confidence, reason, scores, hits };
}

function showResult(result) {
  const resultCard = document.getElementById("result");
  document.getElementById("label").textContent = result.classification;
  document.getElementById("confidence").textContent = result.confidence;
  document.getElementById("reason").textContent = result.reason;
  const scoresEl = document.getElementById("scores");
  if (scoresEl) {
    scoresEl.textContent = `Scores: Descriptive ${result.scores.Descriptive}, Analytic ${result.scores.Analytic}, Predictive ${result.scores.Predictive}, Prescriptive ${result.scores.Prescriptive}`;
  }
  resultCard.classList.remove("hidden");
}

function classifyCurrentQuestion() {
  const question = document.getElementById("question").value;
  const result = classify(question);
  if (!result) {
    alert("Please enter a research question first.");
    return;
  }
  showResult(result);
}

if (typeof window !== "undefined") {
  window.EpiAimClassifier = { classify, scoreQuestion };
  document.getElementById("classifyBtn").addEventListener("click", classifyCurrentQuestion);
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("question").value = "";
    document.getElementById("result").classList.add("hidden");
  });

  document.querySelectorAll(".example").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("question").value = button.dataset.question;
      classifyCurrentQuestion();
    });
  });
}

if (typeof module !== "undefined") {
  module.exports = { classify, scoreQuestion };
}
