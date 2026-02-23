import { P2P } from "../../../ts/service/p2p";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  let p2pB: P2P;
  const p2pA = new P2P({}, (iceCandidate) =>
    p2pB.iceCandidateReceived(iceCandidate),
  );
  p2pB = new P2P({}, (iceCandidate) => p2pA.iceCandidateReceived(iceCandidate));

  const offerA = await p2pA.createOffer();
  if (offerA) {
    const answer = await p2pB.createAnswer(offerA);
    if (answer) {
      p2pA.answerReceived(answer);
    }
  }

  setTimeout(() => {
    const a = p2pA;
    const b = p2pB;
    debugger;
  }, 5000);
}

happyPath();
