const $=id=>document.getElementById(id);
const qs=[
"Imagine you are designing a scalable system for millions of users. Walk me through the architecture you would choose and why.",
"Tell me about a technically difficult problem you solved. What was your reasoning process?",
"How would you identify and fix a performance bottleneck in a production API?",
"A service you own suddenly starts returning 20% more errors. What would you investigate first?",
"How do you balance clean architecture with the pressure to ship quickly?",
"Describe a time you disagreed with a technical decision. How did you handle it?",
"How would you design the database layer for a high-traffic application?",
"What trade-offs would you consider when choosing synchronous versus asynchronous processing?",
"Explain a recent technology you learned and how you would decide whether to use it in production.",
"What would you want us to know about how you would contribute to this team?"
];
let n=0,total=10,started=false;

$("resume").onchange=e=>{let f=e.target.files[0];$("file").textContent=f?f.name:"Drop your resume here";if(f)toast("Resume selected")};
$("start").onclick=()=>{
 started=true;n=1;$("setup").classList.add("hidden");$("interview").classList.remove("hidden");
 $("title").textContent=($("role").value.trim()||"Software Engineer")+" interview";
 $("status").textContent="Interview active";$("dot").classList.add("live");render();
};
function render(){
 $("question").textContent=qs[n-1];$("count").textContent=`${n} / ${total}`;$("bar").style.width=n/total*100+"%";
 $("answer").value="";words();$("evaluation").classList.add("hidden");$("badge").textContent="READY";
 $("signal").textContent="Listening";$("signalText").textContent="Your answer will be evaluated by all three interview agents.";
 $("focus").textContent=n%3===0?"Technical depth":n%2===0?"Problem solving":"Architecture";
}
$("answer").oninput=words;
function words(){let t=$("answer").value.trim();$("words").textContent=(t?t.split(/\s+/).length:0)+" words"}
$("answer").onkeydown=e=>{if(e.ctrlKey&&e.key==="Enter")submit()};
$("submit").onclick=submit;
async function submit(){
 if(!$("answer").value.trim()){toast("Write an answer first");return}
 $("submit").disabled=true;$("badge").textContent="EVALUATING";$("signal").textContent="Three agents are evaluating";$("signalText").textContent="Sarah, Alex and Marcus are reviewing your answer in parallel.";
 await new Promise(r=>setTimeout(r,900));
 let len=$("answer").value.trim().length,score=Math.min(10,Math.max(5,6+Math.floor(len/120)));
 $("score").textContent=score;$("feedback").textContent=score>=8?"Strong response. Good structure and clear technical reasoning.":"Solid start. Add more concrete trade-offs, examples and measurable reasoning.";
 $("evaluation").classList.remove("hidden");$("badge").textContent="EVALUATED";$("signal").textContent="Evaluation complete";
 $("submit").disabled=false;
 setTimeout(()=>{if(n>=total)finish();else{n++;render()}},900);
}
$("play").onclick=()=>{if($("play").dataset.playing)return;$("play").dataset.playing=1;$("play").firstChild.textContent="Playing... ";$("badge").textContent="SPEAKING";setTimeout(()=>{$("play").dataset.playing="";$("play").firstChild.textContent="▶  Play question ";$("badge").textContent="READY"},1800)};
function finish(){
 $("interview").classList.add("hidden");$("complete").classList.remove("hidden");$("status").textContent="Completed";$("count").textContent="10 / 10";$("bar").style.width="100%";
 $("completeText").textContent=`Your ${$("role").value.trim()||"Software Engineer"} interview has been evaluated by the multi-agent panel.`;
}
function reset(){location.reload()}
$("reset").onclick=reset;$("again").onclick=reset;
function toast(t){let x=$("toast");x.textContent=t;x.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>x.classList.remove("show"),1700)}
