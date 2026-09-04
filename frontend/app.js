const $ = id => document.getElementById(id);

const API_BASE = "https://suijith-project-production.up.railway.app";
const TOTAL = 10;
const TIME = 90;

let currentQuestion = "";
let questionNumber = 0;
let averageScore = 0;
let timeLeft = TIME;
let timer = null;
let history = [];

// =========================================================
// RESUME FILE
// =========================================================

$("resume").addEventListener("change", e => {
    $("file").textContent =
        e.target.files[0]?.name || "Choose your resume";
});


// =========================================================
// START INTERVIEW
// =========================================================

$("start").addEventListener("click", startInterview);

async function startInterview() {

    const company = $("company").value.trim();
    const role = $("role").value.trim();
    const file = $("resume").files[0];

    if (!company) {
        return toast("Enter the company name");
    }

    if (!role) {
        return toast("Enter the role");
    }

    if (!file) {
        return toast("Upload your resume");
    }

    try {

        $("start").disabled = true;
        $("start").textContent = "Starting...";

        setStatus("Starting interview", true);

        const resume = await file.text();

        const response = await fetch(
            API_BASE + "/api/start-interview",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    company: company,
                    role: role,
                    resume: resume
                })
            }
        );

        if (!response.ok) {
            throw new Error("Start interview failed");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error("Start interview failed");
        }

        currentQuestion = data.question;
        questionNumber = 1;
        history = [];
        averageScore = 0;

        $("setup").classList.add("hidden");

        $("review").classList.add("hidden");

        $("interview").classList.remove("hidden");

        $("title").textContent = role + " interview";

        renderQuestion();

    } catch (error) {

        console.error(error);

        setStatus("Not started", false);

        toast("Could not connect to interview backend");

    } finally {

        $("start").disabled = false;
        $("start").textContent = "Start interview";
    }
}


// =========================================================
// RENDER QUESTION
// =========================================================

function renderQuestion() {

    $("question").textContent = currentQuestion;

    $("questionNumber").textContent =
        String(questionNumber).padStart(2, "0");

    $("count").textContent =
        `${questionNumber} / ${TOTAL}`;

    $("bar").style.width =
        (questionNumber / TOTAL * 100) + "%";

    $("answer").value = "";

    $("words").textContent = "0 words";

    $("evaluation").classList.add("hidden");

    $("badge").textContent = "READY";

    $("signal").textContent = "Listening";

    $("signalText").textContent =
        "Take your time. Your answer will be reviewed by all three agents.";

    $("focus").textContent =
        questionNumber % 3 === 0
            ? "Technical depth"
            : questionNumber % 2 === 0
                ? "Problem solving"
                : "Architecture";

    resetAgents();

    startTimer();
}


// =========================================================
// TIMER
// =========================================================

function startTimer() {

    clearInterval(timer);

    timeLeft = TIME;

    updateTimer();

    timer = setInterval(() => {

        timeLeft--;

        updateTimer();

        if (timeLeft <= 0) {

            clearInterval(timer);

            toast("Time is up. Submitting your answer...");

            submitAnswer(true);
        }

    }, 1000);
}


function updateTimer() {

    const minutes =
        String(Math.floor(timeLeft / 60)).padStart(2, "0");

    const seconds =
        String(timeLeft % 60).padStart(2, "0");

    $("timer").textContent =
        `${minutes}:${seconds}`;

    $("timer").classList.toggle(
        "warning",
        timeLeft <= 30 && timeLeft > 10
    );

    $("timer").classList.toggle(
        "danger",
        timeLeft <= 10
    );
}


// =========================================================
// WORD COUNT
// =========================================================

$("answer").addEventListener("input", () => {

    const text = $("answer").value.trim();

    const count =
        text
            ? text.split(/\s+/).length
            : 0;

    $("words").textContent =
        count + " words";
});


// =========================================================
// CTRL + ENTER
// =========================================================

$("answer").addEventListener("keydown", e => {

    if (e.ctrlKey && e.key === "Enter") {

        submitAnswer(false);
    }
});


// =========================================================
// SUBMIT ANSWER
// =========================================================

$("submit").addEventListener(
    "click",
    () => submitAnswer(false)
);


async function submitAnswer(fromTimer = false) {

    const answer =
        $("answer").value.trim();

    const file =
        $("resume").files[0];

    if (!answer && !fromTimer) {

        return toast("Write an answer first");
    }

    if (!file) {

        return toast("Resume is missing");
    }

    clearInterval(timer);

    try {

        $("submit").disabled = true;

        $("nextQuestion").disabled = true;

        $("badge").textContent =
            "EVALUATING";

        $("signal").textContent =
            "Three agents evaluating";

        $("signalText").textContent =
            "Sarah, Alex and Marcus are reviewing your answer in parallel.";

        setAgent("Sarah", "evaluating");
        setAgent("Alex", "evaluating");
        setAgent("Marcus", "evaluating");

        const resume =
            await file.text();

        const response =
            await fetch(
                API_BASE + "/api/evaluate-answer",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        company:
                            $("company").value.trim(),

                        role:
                            $("role").value.trim(),

                        resume:
                            resume,

                        question:
                            currentQuestion,

                        answer:
                            answer ||
                            "(No answer submitted before time expired.)"
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                "Evaluation failed"
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                "Evaluation failed"
            );
        }

        averageScore =
            Number(data.average_score) || 0;

        history.push({

            questionNumber:
                questionNumber,

            question:
                currentQuestion,

            answer:
                answer ||
                "(No answer submitted before time expired.)",

            averageScore:
                averageScore,

            evaluations:
                data.evaluations || []
        });

        $("score").textContent =
            (averageScore / 10).toFixed(1);

        renderResults(
            data.evaluations || []
        );

        $("feedback").textContent =
            "All three agents have finished. Review the feedback, then continue when you are ready.";

        $("evaluation").classList.remove(
            "hidden"
        );

        $("badge").textContent =
            "EVALUATED";

        $("signal").textContent =
            "Evaluation complete";

        $("signalText").textContent =
            "You control when to continue.";

        if (questionNumber >= TOTAL) {

            $("nextQuestion").innerHTML =
                'View final review <span>→</span>';

        } else {

            $("nextQuestion").innerHTML =
                'Next question <span>→</span>';
        }

    } catch (error) {

        console.error(error);

        toast(
            "Something went wrong. Check the backend."
        );

        $("badge").textContent =
            "ERROR";

        resetAgents();

    } finally {

        $("submit").disabled = false;

        $("nextQuestion").disabled = false;
    }
}


// =========================================================
// AGENT STATUS
// =========================================================

function resetAgents() {

    setAgent("Sarah", "idle");
    setAgent("Alex", "idle");
    setAgent("Marcus", "idle");
}


function setAgent(name, state) {

    const element =
        $("agent" + name);

    const check =
        $("check" + name);

    element.classList.remove(
        "evaluating",
        "evaluated"
    );

    if (state === "evaluating") {

        element.classList.add(
            "evaluating"
        );

        check.textContent =
            "…";

    } else if (state === "evaluated") {

        element.classList.add(
            "evaluated"
        );

        check.textContent =
            "✓";

    } else {

        check.textContent =
            "—";
    }
}


// =========================================================
// DISPLAY AGENT RESULTS
// =========================================================

function renderResults(list) {

    $("agentResults").innerHTML = "";

    list.forEach(agent => {

        setAgent(
            agent.agent,
            "evaluated"
        );

        const card =
            document.createElement("div");

        card.className =
            "result";

        card.innerHTML = `

            <b>
                ${esc(agent.agent)}
            </b>

            <span>
                ${(
                    (Number(agent.score) || 0) / 10
                ).toFixed(1)}/10
            </span>

            <p>
                ${esc(
                    agent.feedback ||
                    "No feedback."
                )}
            </p>
        `;

        $("agentResults").appendChild(
            card
        );
    });
}


// =========================================================
// NEXT QUESTION
// =========================================================

$("nextQuestion").addEventListener(
    "click",
    nextQuestion
);


async function nextQuestion() {

    if (questionNumber >= TOTAL) {

        return showFinalReview();
    }

    const latest =
        history[history.length - 1];

    const file =
        $("resume").files[0];

    if (!latest || !file) {

        return toast(
            "Interview data is missing"
        );
    }

    try {

        $("nextQuestion").disabled = true;

        $("signal").textContent =
            "Generating next question";

        $("signalText").textContent =
            "The interviewer is adapting the next question to your performance.";

        const resume =
            await file.text();

        const response =
            await fetch(
                API_BASE + "/api/next-question",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        company:
                            $("company").value.trim(),

                        role:
                            $("role").value.trim(),

                        resume:
                            resume,

                        previous_question:
                            latest.question,

                        previous_answer:
                            latest.answer,

                        average_score:
                            latest.averageScore
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                "Next question failed"
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                "Next question failed"
            );
        }

        currentQuestion =
            data.next_question;

        questionNumber++;

        renderQuestion();

    } catch (error) {

        console.error(error);

        toast(
            "Could not generate next question"
        );

    } finally {

        $("nextQuestion").disabled = false;
    }
}


// =========================================================
// FINAL REVIEW
// =========================================================

function showFinalReview() {

    clearInterval(timer);

    $("interview").classList.add(
        "hidden"
    );

    $("review").classList.remove(
        "hidden"
    );

    $("status").textContent =
        "Interview completed";

    $("bar").style.width =
        "100%";

    $("count").textContent =
        TOTAL + " / " + TOTAL;

    const overall =
        history.length
            ? history.reduce(
                (sum, item) =>
                    sum + item.averageScore,
                0
            ) / history.length / 10
            : 0;

    $("finalScore").textContent =
        overall.toFixed(1);


    // -----------------------------------------------------
    // FINAL AGENT SCORES
    // -----------------------------------------------------

    const totals = {};

    history.forEach(item => {

        item.evaluations.forEach(agent => {

            if (!totals[agent.agent]) {

                totals[agent.agent] = [];
            }

            totals[agent.agent].push(
                Number(agent.score) || 0
            );
        });
    });


    $("finalAgents").innerHTML =
        Object.entries(totals)
            .map(([name, scores]) => {

                const average =
                    scores.reduce(
                        (a, b) => a + b,
                        0
                    ) / scores.length / 10;

                return `

                    <div class="result">

                        <b>
                            ${esc(name)}
                        </b>

                        <span>
                            ${average.toFixed(1)}/10
                        </span>

                        <p>
                            Final average across
                            ${scores.length}
                            evaluated answers.
                        </p>

                    </div>
                `;
            })
            .join("");


    // -----------------------------------------------------
    // QUESTION REVIEW
    // -----------------------------------------------------

    $("reviewList").innerHTML =
        history
            .map(item => {

                return `

                    <article class="review-item">

                        <div class="review-item-head">

                            <h4>
                                QUESTION
                                ${String(
                                    item.questionNumber
                                ).padStart(2, "0")}
                            </h4>

                            <span class="review-score">
                                ${(
                                    item.averageScore / 10
                                ).toFixed(1)}
                                / 10
                            </span>

                        </div>


                        <div class="review-question">

                            ${esc(
                                item.question
                            )}

                        </div>


                        <div class="review-answer">

                            <strong>
                                Your answer:
                            </strong>

                            <br>

                            ${esc(
                                item.answer
                            )}

                        </div>


                        <div class="review-feedback">

                            <strong>
                                Panel feedback:
                            </strong>

                            <br>

                            ${item.evaluations
                                .map(agent =>
                                    esc(agent.agent) +
                                    ": " +
                                    esc(
                                        agent.feedback ||
                                        "No feedback."
                                    )
                                )
                                .join("<br>")
                            }

                        </div>

                    </article>
                `;
            })
            .join("");
}


// =========================================================
// TEXT TO SPEECH
// =========================================================

$("play").addEventListener(
    "click",
    () => {

        if (!("speechSynthesis" in window)) {

            return toast(
                "Text-to-speech is not supported in this browser"
            );
        }

        const button =
            $("play");


        // Stop speaking
        if (speechSynthesis.speaking) {

            speechSynthesis.cancel();

            button.classList.remove(
                "playing"
            );

            $("playSymbol").textContent =
                "▶";

            $("playLabel").textContent =
                "Read question aloud";

            $("badge").textContent =
                "READY";

            return;
        }


        const utterance =
            new SpeechSynthesisUtterance(
                currentQuestion
            );

        utterance.rate =
            0.95;


        utterance.onstart =
            () => {

                button.classList.add(
                    "playing"
                );

                $("playSymbol").textContent =
                    "■";

                $("playLabel").textContent =
                    "Stop reading";

                $("badge").textContent =
                    "SPEAKING";
            };


        utterance.onend =
            () => {

                button.classList.remove(
                    "playing"
                );

                $("playSymbol").textContent =
                    "▶";

                $("playLabel").textContent =
                    "Read question aloud";

                $("badge").textContent =
                    "READY";
            };


        utterance.onerror =
            () => {

                button.classList.remove(
                    "playing"
                );

                $("playSymbol").textContent =
                    "▶";

                $("playLabel").textContent =
                    "Read question aloud";

                $("badge").textContent =
                    "READY";

                toast(
                    "Could not read the question aloud"
                );
            };


        speechSynthesis.cancel();

        speechSynthesis.speak(
            utterance
        );
    }
);


// =========================================================
// STATUS
// =========================================================

function setStatus(text, live) {

    $("status").textContent =
        text;

    $("dot").classList.toggle(
        "live",
        live
    );
}


// =========================================================
// TOAST
// =========================================================

function toast(text) {

    const element =
        $("toast");

    element.textContent =
        text;

    element.classList.add(
        "show"
    );

    clearTimeout(
        window.toastTimer
    );

    window.toastTimer =
        setTimeout(() => {

            element.classList.remove(
                "show"
            );

        }, 2400);
}


// =========================================================
// HTML ESCAPE
// =========================================================

function esc(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// =========================================================
// RESET
// =========================================================

function reset() {

    clearInterval(timer);

    if ("speechSynthesis" in window) {

        speechSynthesis.cancel();
    }

    location.reload();
}


$("reset").addEventListener(
    "click",
    reset
);


$("again").addEventListener(
    "click",
    reset
);
