const $ = id => document.getElementById(id);


// =====================================================
// BACKEND
// =====================================================

const API_BASE =
    "https://suijith-project-production.up.railway.app";


// =====================================================
// INTERVIEW STATE
// =====================================================

const totalQuestions = 10;

let currentQuestion = "";

let questionNumber = 0;

let averageScore = 0;

let timerInterval = null;

let timeLeft = 90;

let interviewHistory = [];


// =====================================================
// AGENTS
// =====================================================

const agentElements = {

    Sarah: $("agentSarah"),

    Alex: $("agentAlex"),

    Marcus: $("agentMarcus")

};


// =====================================================
// RESUME
// =====================================================

$("resume").onchange = e => {

    const file = e.target.files[0];

    $("file").textContent =
        file
            ? file.name
            : "Drop your resume here";

};


// =====================================================
// START
// =====================================================

$("start").onclick = startInterview;


async function startInterview() {

    const company =
        $("company").value.trim();

    const role =
        $("role").value.trim();

    const file =
        $("resume").files[0];


    if (!company) {

        toast("Enter the company name");

        return;

    }


    if (!role) {

        toast("Enter the role");

        return;

    }


    if (!file) {

        toast("Upload your resume");

        return;

    }


    try {

        $("start").disabled = true;

        $("start").textContent =
            "Starting...";


        $("status").textContent =
            "Starting interview";


        $("dot").classList.add("live");


        const resume =
            await file.text();


        const response =
            await fetch(
                `${API_BASE}/api/start-interview`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        company,

                        role,

                        resume

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Backend request failed"
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                "Interview could not start"
            );

        }


        currentQuestion =
            data.question;


        questionNumber = 1;

        averageScore = 0;

        interviewHistory = [];


        $("setup")
            .classList
            .add("hidden");


        $("interview")
            .classList
            .remove("hidden");


        $("title").textContent =
            `${role} interview`;


        $("status").textContent =
            "Interview active";


        renderQuestion();


    }

    catch (error) {

        console.error(error);

        toast(
            "Could not connect to interview backend"
        );

    }

    finally {

        $("start").disabled = false;

        $("start").innerHTML =
            'Start interview <span>→</span>';

    }

}


// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion() {

    $("question").textContent =
        currentQuestion;


    $("count").textContent =
        `${questionNumber} / ${totalQuestions}`;


    $("bar").style.width =
        `${(questionNumber / totalQuestions) * 100}%`;


    $("answer").value = "";


    $("evaluation")
        .classList
        .add("hidden");


    $("badge").textContent =
        "READY";


    $("signal").textContent =
        "Listening";


    $("signalText").textContent =
        "Take your time and answer clearly.";


    $("focus").textContent =
        questionNumber % 3 === 0
            ? "Technical depth"
            : questionNumber % 2 === 0
                ? "Problem solving"
                : "Architecture";


    $("speakerRole").textContent =
        "AI Interviewer";


    startTimer();

}


// =====================================================
// TIMER
// =====================================================

function startTimer() {

    clearInterval(timerInterval);


    timeLeft = 90;

    updateTimer();


    timerInterval =
        setInterval(() => {

            timeLeft--;

            updateTimer();


            if (timeLeft <= 0) {

                clearInterval(timerInterval);

                toast(
                    "Time is up. Submitting answer..."
                );

                submitAnswer();

            }

        }, 1000);

}


function updateTimer() {

    const minutes =
        Math.floor(timeLeft / 60)
            .toString()
            .padStart(2, "0");


    const seconds =
        (timeLeft % 60)
            .toString()
            .padStart(2, "0");


    $("timer").textContent =
        `${minutes}:${seconds}`;

}


// =====================================================
// WORD COUNT
// =====================================================

$("answer").oninput =
    updateWordCount;


function updateWordCount() {

    const text =
        $("answer")
            .value
            .trim();


    const count =
        text
            ? text.split(/\s+/).length
            : 0;


    $("words").textContent =
        `${count} words`;

}


// =====================================================
// CTRL + ENTER
// =====================================================

$("answer").onkeydown = e => {

    if (
        e.ctrlKey &&
        e.key === "Enter"
    ) {

        submitAnswer();

    }

};


// =====================================================
// SUBMIT
// =====================================================

$("submit").onclick =
    submitAnswer;


async function submitAnswer() {

    const answer =
        $("answer")
            .value
            .trim();


    if (!answer) {

        toast(
            "Write an answer first"
        );

        return;

    }


    clearInterval(timerInterval);


    const company =
        $("company")
            .value
            .trim();


    const role =
        $("role")
            .value
            .trim();


    const file =
        $("resume")
            .files[0];


    if (!file) {

        toast(
            "Resume is missing"
        );

        return;

    }


    try {

        $("submit").disabled = true;


        $("badge").textContent =
            "EVALUATING";


        $("signal").textContent =
            "Three agents evaluating";


        $("signalText").textContent =
            "Sarah, Alex and Marcus are reviewing your answer.";


        const resume =
            await file.text();


        // =============================================
        // EVALUATE
        // =============================================

        const response =
            await fetch(
                `${API_BASE}/api/evaluate-answer`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        company,

                        role,

                        resume,

                        question:
                            currentQuestion,

                        answer

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Evaluation request failed"
            );

        }


        const evaluation =
            await response.json();


        if (!evaluation.success) {

            throw new Error(
                "Evaluation failed"
            );

        }


        averageScore =
            evaluation.average_score;


        const scoreOutOf10 =
            (
                averageScore / 10
            ).toFixed(1);


        $("score").textContent =
            scoreOutOf10;


        // =============================================
        // STORE HISTORY
        // =============================================

        interviewHistory.push({

            questionNumber,

            question:
                currentQuestion,

            answer,

            averageScore,

            evaluations:
                evaluation.evaluations

        });


        // =============================================
        // SHOW 3 AGENTS
        // =============================================

        renderAgentResults(
            evaluation.evaluations
        );


        $("feedback").textContent =
            "Review the evaluation above before continuing.";


        $("evaluation")
            .classList
            .remove("hidden");


        $("badge").textContent =
            "EVALUATED";


        $("signal").textContent =
            "Evaluation complete";


        $("signalText").textContent =
            "Your answer has been reviewed by all three AI agents.";


        // =============================================
        // IMPORTANT:
        // NO AUTOMATIC NEXT QUESTION
        // =============================================

        if (
            questionNumber >=
            totalQuestions
        ) {

            $("nextQuestion").textContent =
                "View final review →";

        }

    }

    catch (error) {

        console.error(error);

        toast(
            "Something went wrong. Check the backend."
        );

        $("badge").textContent =
            "ERROR";

    }

    finally {

        $("submit").disabled = false;

    }

}


// =====================================================
// AGENT RESULTS
// =====================================================

function renderAgentResults(
    evaluations
) {

    const container =
        $("agentResults");


    container.innerHTML = "";


    evaluations.forEach(agent => {

        const score =
            (
                agent.score / 10
            ).toFixed(1);


        const card =
            document.createElement("div");


        card.className =
            "agent-result";


        card.innerHTML = `

            <strong>
                ${agent.agent}
            </strong>

            <span>
                ${score}/10
            </span>

            <p>
                ${agent.feedback}
            </p>

        `;


        container.appendChild(card);


        // Highlight all agents
        if (
            agentElements[agent.agent]
        ) {

            agentElements[
                agent.agent
            ].classList.add("evaluated");

        }

    });

}


// =====================================================
// NEXT QUESTION BUTTON
// =====================================================

$("nextQuestion").onclick =
    nextQuestion;


async function nextQuestion() {

    // =============================================
    // FINAL QUESTION
    // =============================================

    if (
        questionNumber >=
        totalQuestions
    ) {

        showFinalReview();

        return;

    }


    const latest =
        interviewHistory[
            interviewHistory.length - 1
        ];


    const company =
        $("company")
            .value
            .trim();


    const role =
        $("role")
            .value
            .trim();


    const file =
        $("resume")
            .files[0];


    try {

        $("nextQuestion").disabled = true;


        $("signal").textContent =
            "Generating next question";


        const resume =
            await file.text();


        const response =
            await fetch(
                `${API_BASE}/api/next-question`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        company,

                        role,

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
                "Next question request failed"
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


        // Reset agent states

        Object.values(
            agentElements
        ).forEach(element => {

            element.classList.remove(
                "evaluated"
            );

        });


        renderQuestion();

    }

    catch (error) {

        console.error(error);

        toast(
            "Could not generate next question"
        );

    }

    finally {

        $("nextQuestion").disabled =
            false;

    }

}


// =====================================================
// FINAL REVIEW
// =====================================================

function showFinalReview() {

    clearInterval(timerInterval);


    $("interview")
        .classList
        .add("hidden");


    $("review")
        .classList
        .remove("hidden");


    $("status").textContent =
        "Interview completed";


    $("bar").style.width =
        "100%";


    $("count").textContent =
        `${totalQuestions} / ${totalQuestions}`;


    // =============================================
    // FINAL SCORE
    // =============================================

    const total =
        interviewHistory.reduce(
            (sum, item) =>
                sum + item.averageScore,
            0
        );


    const finalScore =
        interviewHistory.length
            ? (
                total /
                interviewHistory.length /
                10
            ).toFixed(1)
            : "0.0";


    $("finalScore").textContent =
        finalScore;


    // =============================================
    // AGENT FINAL SCORES
    // =============================================

    const agentTotals = {};


    interviewHistory.forEach(item => {

        item.evaluations.forEach(agent => {

            if (!agentTotals[agent.agent]) {

                agentTotals[agent.agent] = [];

            }

            agentTotals[
                agent.agent
            ].push(agent.score);

        });

    });


    const finalAgents =
        $("finalAgents");


    finalAgents.innerHTML = "";


    Object.entries(
        agentTotals
    ).forEach(
        ([agent, scores]) => {

            const avg =
                scores.reduce(
                    (a, b) => a + b,
                    0
                ) / scores.length;


            const card =
                document.createElement("div");


            card.className =
                "agent-result";


            card.innerHTML = `

                <strong>
                    ${agent}
                </strong>

                <span>
                    ${(avg / 10).toFixed(1)}/10
                </span>

                <p>
                    Final average evaluation
                </p>

            `;


            finalAgents.appendChild(
                card
            );

        }
    );


    // =============================================
    // QUESTION-BY-QUESTION REVIEW
    // =============================================

    const reviewList =
        $("reviewList");


    reviewList.innerHTML = "";


    interviewHistory.forEach(item => {

        const block =
            document.createElement("div");


        block.className =
            "review-item";


        block.innerHTML = `

            <h3>
                Question ${item.questionNumber}
            </h3>

            <p>
                <strong>Question:</strong>
                ${item.question}
            </p>

            <p>
                <strong>Your answer:</strong>
                ${item.answer}
            </p>

            <p>
                <strong>Score:</strong>
                ${(item.averageScore / 10).toFixed(1)}/10
            </p>

            <p>
                <strong>Feedback:</strong>
                ${item.evaluations
                    .map(
                        agent =>
                            `${agent.agent}: ${agent.feedback}`
                    )
                    .join(" | ")
                }
            </p>

        `;


        reviewList.appendChild(
            block
        );

    });

}


// =====================================================
// PLAY QUESTION
// =====================================================

$("play").onclick = () => {

    if (
        $("play")
            .dataset
            .playing
    ) {

        return;

    }


    $("play")
        .dataset
        .playing = "1";


    $("badge").textContent =
        "SPEAKING";


    $("play")
        .firstChild
        .textContent =
        "Playing... ";


    setTimeout(() => {

        $("play")
            .dataset
            .playing = "";


        $("play")
            .firstChild
            .textContent =
            "▶  Play question ";


        $("badge").textContent =
            "READY";

    }, 1800);

};


// =====================================================
// RESET
// =====================================================

function reset() {

    location.reload();

}


$("reset").onclick =
    reset;


$("again").onclick =
    reset;


// =====================================================
// TOAST
// =====================================================

function toast(message) {

    const element =
        $("toast");


    element.textContent =
        message;


    element.classList.add(
        "show"
    );


    clearTimeout(
        window.tt
    );


    window.tt =
        setTimeout(() => {

            element.classList.remove(
                "show"
            );

        }, 2200);

}
