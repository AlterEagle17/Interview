const $ = id => document.getElementById(id);

// =====================================================
// BACKEND URL
// =====================================================

// Local backend for now
//const API_BASE = "suijith-project-production.up.railway.app";
const API_BASE = "https://suijith-project-production.up.railway.app";

// =====================================================
// INTERVIEW STATE
// =====================================================

let currentQuestion = "";
let currentAnswer = "";
let averageScore = 0;

let questionNumber = 0;
const totalQuestions = 10;


// =====================================================
// RESUME
// =====================================================

$("resume").onchange = async e => {

    const file = e.target.files[0];

    $("file").textContent = file
        ? file.name
        : "Drop your resume here";

    if (file) {
        toast("Resume selected");
    }
};


// =====================================================
// START INTERVIEW
// =====================================================

$("start").onclick = startInterview;


async function startInterview() {

    const company = $("company").value.trim();
    const role = $("role").value.trim();
    const file = $("resume").files[0];

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
        $("start").textContent = "Starting...";

        $("status").textContent = "Starting interview";
        $("dot").classList.add("live");

        // Read resume text
        const resume = await file.text();

        const response = await fetch(
            `${API_BASE}/api/start-interview`,
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
            throw new Error("Backend request failed");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error("Interview could not start");
        }

        // Store first question
        currentQuestion = data.question;

        questionNumber = 1;

        // Show interview screen
        $("setup").classList.add("hidden");
        $("interview").classList.remove("hidden");

        $("title").textContent =
            `${role} interview`;

        $("status").textContent =
            "Interview active";

        renderQuestion();

        toast("Interview started");

    } catch (error) {

        console.error(error);

        toast(
            "Could not connect to interview backend"
        );

    } finally {

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

    words();

    $("evaluation").classList.add("hidden");

    $("badge").textContent = "READY";

    $("signal").textContent = "Listening";

    $("signalText").textContent =
        "Your answer will be evaluated by all three interview agents.";

    $("focus").textContent =
        questionNumber % 3 === 0
            ? "Technical depth"
            : questionNumber % 2 === 0
                ? "Problem solving"
                : "Architecture";
}


// =====================================================
// WORD COUNT
// =====================================================

$("answer").oninput = words;


function words() {

    const text =
        $("answer").value.trim();

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


$("submit").onclick = submitAnswer;


// =====================================================
// SUBMIT ANSWER
// =====================================================

async function submitAnswer() {

    const answer =
        $("answer").value.trim();

    if (!answer) {
        toast("Write an answer first");
        return;
    }

    const company =
        $("company").value.trim();

    const role =
        $("role").value.trim();

    const file =
        $("resume").files[0];

    if (!file) {
        toast("Resume is missing");
        return;
    }

    try {

        $("submit").disabled = true;

        $("badge").textContent =
            "EVALUATING";

        $("signal").textContent =
            "Three agents are evaluating";

        $("signalText").textContent =
            "Sarah, Alex and Marcus are reviewing your answer in parallel.";

        // Read resume again
        const resume =
            await file.text();


        // =============================================
        // 1. EVALUATE ANSWER
        // =============================================

        const evaluationResponse =
            await fetch(
                `${API_BASE}/api/evaluate-answer`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        company: company,
                        role: role,
                        resume: resume,
                        question: currentQuestion,
                        answer: answer
                    })
                }
            );


        if (!evaluationResponse.ok) {
            throw new Error(
                "Evaluation request failed"
            );
        }


        const evaluation =
            await evaluationResponse.json();


        if (!evaluation.success) {
            throw new Error(
                "Evaluation failed"
            );
        }


        // Store average score
        averageScore =
            evaluation.average_score;


        // Convert 0-100 → 0-10
        const scoreOutOf10 =
            (averageScore / 10).toFixed(1);


        $("score").textContent =
            scoreOutOf10;


        // Show feedback
        const feedback =
            evaluation.evaluations
                .map(agent =>
                    `${agent.agent}: ${agent.feedback}`
                )
                .join(" ");


        $("feedback").textContent =
            feedback;


        $("evaluation")
            .classList.remove("hidden");


        $("badge").textContent =
            "EVALUATED";

        $("signal").textContent =
            "Evaluation complete";


        // =============================================
        // 2. FINISH OR GET NEXT QUESTION
        // =============================================

        if (questionNumber >= totalQuestions) {

            finish();

            return;
        }


        // =============================================
        // 3. GET NEXT ADAPTIVE QUESTION
        // =============================================

        const nextResponse =
            await fetch(
                `${API_BASE}/api/next-question`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        company: company,
                        role: role,
                        resume: resume,
                        previous_question:
                            currentQuestion,
                        previous_answer:
                            answer,
                        average_score:
                            averageScore
                    })
                }
            );


        if (!nextResponse.ok) {
            throw new Error(
                "Next question request failed"
            );
        }


        const nextData =
            await nextResponse.json();


        if (!nextData.success) {
            throw new Error(
                "Next question failed"
            );
        }


        // Store next question
        currentQuestion =
            nextData.next_question;


        questionNumber++;


        // Small delay so user can see evaluation
        setTimeout(() => {

            renderQuestion();

        }, 1200);


    } catch (error) {

        console.error(error);

        toast(
            "Something went wrong. Check the backend."
        );

        $("badge").textContent =
            "ERROR";

    } finally {

        $("submit").disabled = false;
    }
}


// =====================================================
// PLAY QUESTION
// =====================================================

$("play").onclick = () => {

    if ($("play").dataset.playing) {
        return;
    }

    $("play").dataset.playing = "1";

    $("badge").textContent =
        "SPEAKING";

    $("play").firstChild.textContent =
        "Playing... ";

    setTimeout(() => {

        $("play").dataset.playing = "";

        $("play").firstChild.textContent =
            "▶  Play question ";

        $("badge").textContent =
            "READY";

    }, 1800);
};


// =====================================================
// FINISH INTERVIEW
// =====================================================

function finish() {

    $("interview")
        .classList.add("hidden");

    $("complete")
        .classList.remove("hidden");

    $("status").textContent =
        "Completed";

    $("count").textContent =
        `${totalQuestions} / ${totalQuestions}`;

    $("bar").style.width =
        "100%";

    $("completeText").textContent =
        `Your ${
            $("role").value.trim()
            || "Software Engineer"
        } interview has been evaluated by the multi-agent panel.`;
}


// =====================================================
// RESET
// =====================================================

function reset() {

    location.reload();
}


$("reset").onclick = reset;

$("again").onclick = reset;


// =====================================================
// TOAST
// =====================================================

function toast(message) {

    const element =
        $("toast");

    element.textContent =
        message;

    element.classList.add("show");

    clearTimeout(window.tt);

    window.tt =
        setTimeout(() => {

            element.classList.remove("show");

        }, 1700);
}
