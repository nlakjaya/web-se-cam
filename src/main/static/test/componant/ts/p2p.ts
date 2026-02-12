import { Logger } from "../../../ts/util/logger";
import { sleep } from "../../ts/base";

// TODO: make service
class P2P {
  private peerConnection: RTCPeerConnection;
  private channel?: RTCDataChannel;

  constructor(
    private logger: Logger,
    config: RTCConfiguration = {},
    onIceCandidate: (iceCandidate: RTCIceCandidate) => Promise<void>,
  ) {
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      logger.debug("(native).onicecandidate called:", event);
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };
    this.peerConnection.ondatachannel = (event) => {
      logger.debug("(native).ondatachannel called:", event);
      this.setupDataChannel(event.channel);
    };
    this.peerConnection.onconnectionstatechange = (event) => {
      logger.debug("(native).onconnectionstatechange called:", event);
    };

    logger.debug("instance created");
  }

  private setupDataChannel(dataChannel: RTCDataChannel) {
    this.logger.debug("setupDataChannel called:", dataChannel);
    this.channel = dataChannel;
    dataChannel.onopen = (event) => {
      this.logger.debug("(native).onopen called:", event);
    };
    dataChannel.onclose = (event) => {
      this.logger.debug("(native).onclose called:", event);
    };
    dataChannel.onmessage = (event) => {
      this.logger.debug("(native).onmessage called:", event);
    };
  }

  async createOffer() {
    this.logger.debug("createOffer called");
    const channel = this.peerConnection.createDataChannel("default");
    this.setupDataChannel(channel);

    const offer = await this.peerConnection.createOffer();
    this.logger.debug("offer created:", offer);
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription;
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit) {
    this.logger.debug("createAnswer called:", remoteOffer);
    await this.peerConnection.setRemoteDescription(remoteOffer);

    const answer = await this.peerConnection.createAnswer();
    this.logger.debug("answer created:", answer);
    await this.peerConnection.setLocalDescription(answer);

    return this.peerConnection.localDescription;
  }

  async answerReceived(answer: RTCSessionDescription) {
    this.logger.debug("answerReceived called:", answer);
    await this.peerConnection.setRemoteDescription(answer);
  }

  async iceCandidateReceived(iceCandidate: RTCIceCandidate) {
    this.logger.debug("iceCandidateReceived called:", iceCandidate);
    await this.peerConnection.addIceCandidate(iceCandidate);
  }

  async send(message: string) {
    this.logger.debug("send called:", message);
    this.channel?.send(message);
  }
}

async function happyPath() {
  const loggerA = new Logger("p2pA");
  const loggerB = new Logger("p2pB");

  let p2pB: P2P;
  const p2pA = new P2P(loggerA, {}, (iceCandidate) =>
    p2pB.iceCandidateReceived(iceCandidate),
  );
  p2pB = new P2P(loggerB, {}, (iceCandidate) =>
    p2pA.iceCandidateReceived(iceCandidate),
  );

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
