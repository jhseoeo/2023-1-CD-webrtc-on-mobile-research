<div id="top"></div>

<br />
<div align="center">
  <h2 align="center">2023-1 Graduation Project</h2>

  <p align="center">
    모빌리티 환경에서 안정적인 WebRTC 미디어 스트리밍을 위한 연구<br>
    본 프로젝트는 펫 CCTV 애플리케이션인 <a href="https://dogibogi.co.kr/">도기보기</a>를 서비스 중인 펫페오톡 사와의 협업으로 진행되었습니다.
</div>

<br>

## Abstract

WebRTC는 화상 통신 등 다양한 미디어 데이터를 주고받기 위한 실시간 P2P 스트리밍 솔루션으로 자리잡았다. 하지만 모바일 환경에서는 네트워크의 불안정성으로 인해 연결이 종료되고 스트리밍이 중단되어 사용자 경험을 저하시키는 일이 잦다. 이에 모바일 환경에서 WebRTC 연결 중단을 일으키는 원인을 탐색하고, 안정적으로 유지하기 위한 방법을 모색하는 연구를 진행한다.

<br>

## Build with

-   [Golang](https://go.dev/)
-   [GoFiber](https://gofiber.io/)
-   [GoFiber/Websocket](https://github.com/gofiber/websocket)
-   [Node.js](https://nodejs.org/en/)
-   [Sveltekit](https://kit.svelte.dev/)
-   [amazon-kinesis-video-streams-webrtc-sdk-js](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js)

<br>

## Requirements

-   Golang 1.18 or higher
-   Node.js 16.18.0 or higher
-   AWS Account 또는 Kinesis Video Streaming Signaling Channel 접근 권한이 있는 IAM Account

<br>

## Getting Started

1. Clone project and Install dependencies

    ```bash
    git clone https://github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research
    cd 2023-1-CD-webrtc-on-mobile-research
    go mod download
    cd frontend
    npm install
    cd ..
    ```

2. Configure `.env` file

    ```bash
    vim .env
    ##### Write down your configuration #####
    cd frontend
    vim .env
    ##### Write down your configuration #####
    cd ..
    ```

3. Build frontend package into Static web resources

    ```bash
    cd frontend
    npm run build
    cd ..
    ```

4. Run server

    ```bash
    go run ./...
    ```

<br>

## Links

-   [테스트 및 성능 평과 결과](https://github.com/junhyuk0801/2023-1-CD-webrtc-on-mobile-research)
-   TBD

<br>

## Member

|  Name  |    Major     |   Number   |         Email         |
| :----: | :----------: | :--------: | :-------------------: |
| 서준혁 | 컴퓨터공학과 | 2018102198 | junhyuk0801@gmail.com |
