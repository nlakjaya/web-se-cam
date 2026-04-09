import { Logger } from "../util/logger";

const logger = new Logger("P2P");
export class P2P {
  private peerConnection: RTCPeerConnection;
  private channel?: RTCDataChannel; // TODO: multiple channels and event listeners

  constructor(
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
    logger.debug("setupDataChannel called:", dataChannel);
    this.channel = dataChannel;
    dataChannel.onopen = (event) => {
      logger.debug("(native).onopen called:", event);
    };
    dataChannel.onclose = (event) => {
      logger.debug("(native).onclose called:", event);
    };
    dataChannel.onmessage = (event) => {
      logger.debug("(native).onmessage called:", event); // TODO: expose channel
    };
  }

  async createOffer() {
    logger.debug("createOffer called");
    const channel = this.peerConnection.createDataChannel("default");
    this.setupDataChannel(channel);

    const offer = await this.peerConnection.createOffer();
    logger.debug("offer created:", offer);
    await this.peerConnection.setLocalDescription(offer);
    return this.peerConnection.localDescription;
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit) {
    logger.debug("createAnswer called:", remoteOffer);
    await this.peerConnection.setRemoteDescription(remoteOffer);

    const answer = await this.peerConnection.createAnswer();
    logger.debug("answer created:", answer);
    await this.peerConnection.setLocalDescription(answer);

    return this.peerConnection.localDescription;
  }

  async answerReceived(answer: RTCSessionDescription) {
    logger.debug("answerReceived called:", answer);
    await this.peerConnection.setRemoteDescription(answer);
  }

  async iceCandidateReceived(iceCandidate: RTCIceCandidate) {
    logger.debug("iceCandidateReceived called:", iceCandidate);
    await this.peerConnection.addIceCandidate(iceCandidate);
  }

  async send(message: string) {
    logger.debug("send called:", message);
    if (this.channel) {
      this.channel.send(message);
    } else {
      const errorMsg = "no channel";
      logger.error("send failed:", errorMsg);
      throw new Error(errorMsg);
    }
  }
}
