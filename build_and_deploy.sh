docker rm -f beamvr-app
docker build -t beamvr-app .
docker run -d -p 80:80 --name=beamvr-app --restart=always beamvr-app