const LABELS = ["Descriptive", "Analytic", "Predictive", "Prescriptive"];

const patterns = {
  prescriptive: [
    /\bshould\b/i, /\brecommend/i, /\bwhich\s+(intervention|strategy|treatment|policy|patients|groups|screening|outreach)\b/i,
    /\boptimi[sz]e/i, /\bprioriti[sz]e/i, /\ballocat/i, /\btarget/i, /\bdecision\s*(rule|support|analysis)/i,
    /\bpolicy\s*(simulation|optimization|optimisation)/i, /\btreatment\s*recommend/i, /\bintervention\s*recommend/i,
    /\baction\s*(rule|threshold|strategy)/i, /\breinforcement\b/i
  ],
  predictive: [
    /\bpredict/i, /\bforecast/i, /\brisk\s*(prediction|score|model|tool|calculator)/i, /\bclassification\b/i,
    /\bclassify\b/i, /\bmodel\s*(performance|validation|development)/i, /\bvalidat(e|ion|ed|ing)\b/i,
    /\bAUC\b/i, /\bcalibration\b/i, /\bpredicted\s*probabilit/i, /\bprediction\s*score/i,
    /\btrain(ing)?\s*(set|data)|test(ing)?\s*(set|data)|validation\s*split/i, /\bmachine\s*learning\b/i,
    /\bfuture\s*(risk|outcome|cases|burden|demand|hospitali[sz]ation)/i
  ],
  analytic: [
    /\bassociat/i, /\brelationship\s+between\b/i, /\bexposure[- ]outcome\b/i, /\bcausal/i,
    /\brisk\s*factor/i, /\bdeterminant/i, /\bhypothesis\s*test/i, /\bodds\s*ratio/i,
    /\brisk\s*ratio/i, /\bhazard\s*ratio/i, /\badjusted\s*(association|effect|estimate|odds|risk|hazard)/i,
    /\bregression\b/i, /\bstratification\b/i, /\badjustment\b/i, /\beffectiveness\b/i,
    /\bdoes\s+.+\s+(affect|increase|decrease|reduce|cause)/i, /\bimpact\s+of\b/i
  ],
  descriptive: [
    /\bprevalence\b/i, /\bincidence\b/i, /\brates?\b/i, /\bburden\b/i, /\bdistribution/i,
    /\bsurveillance\b/i, /\btrend/i, /\bpopulation\s*characteri[sz]ation\b/i, /\bcharacteri[sz]e\b/i,
    /\bdescribe\b/i, /\bpercentages?\b/i, /\bmeans?\b/i, /\bcross[- ]tabulation/i,
    /\bweighted\s*prevalence\b/i, /\bdescriptive\s*summar/i
  ]
};

function scoreQuestion(question) {
  const scores = { Descriptive: 0, Analytic: 0, Predictive: 0, Prescriptive: 0 };
  for (const [group, regexes] of Object.entries(patterns)) {
    const label = group.charAt(0).toUpperCase() + group.slice(1);
    regexes.forEach((rx) => { if (rx.test(question)) scores[label] += 1; });
  }
  return scores;
}

function classify(question) {
  const q = question.trim();
  if (!q) return null;

  const scores = scoreQuestion(q);

  // Priority for genuinely mixed questions: Prescriptive > Predictive > Analytic > Descriptive.
  let classification = "Descriptive";
  if (scores.Prescriptive > 0) classification = "Prescriptive";
  else if (scores.Predictive > 0) classification = "Predictive";
  else if (scores.Analytic > 0) classification = "Analytic";
  else if (scores.Descriptive > 0) classification = "Descriptive";

  const maxScore = scores[classification];
  const positiveClasses = Object.values(scores).filter(v => v > 0).length;
  let confidence = "High";
  if (maxScore === 0) confidence = "Low";
  else if (positiveClasses > 1 || maxScore === 1) confidence = "Medium";

  let reason = "The question was classified using the dominant final purpose of the research question.";
  if (classification === "Prescriptive") {
    reason = "The question asks for an action, recommendation, optimization, targeting, allocation, intervention, treatment, policy, or decision-support strategy. That final action-guiding purpose makes it prescriptive.";
  } else if (classification === "Predictive") {
    reason = "The question focuses on forecasting, risk prediction, classification, model development, model validation, model performance, predicted probabilities, AUC, calibration, or future outcome estimation.";
  } else if (classification === "Analytic") {
    reason = "The question focuses on association estimation, exposure-outcome relationships, causal inference, risk-factor evaluation, adjusted associations, regression, or hypothesis testing.";
  } else {
    reason = "The question focuses on estimating or describing prevalence, incidence, burden, rates, distributions, surveillance patterns, trends, or population characteristics.";
  }

  if (positiveClasses > 1) {
    reason += " Multiple category cues were present, so the priority rule was applied: Prescriptive > Predictive > Analytic > Descriptive.";
  }

  return { classification, confidence, reason, scores };
}

function showResult(result) {
  const resultCard = document.getElementById("result");
  document.getElementById("label").textContent = result.classification;
  document.getElementById("confidence").textContent = result.confidence;
  document.getElementById("reason").textContent = result.reason;
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
