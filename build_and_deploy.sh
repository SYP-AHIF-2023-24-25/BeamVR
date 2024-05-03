echo "Building and deploying BeamVR app"
docker rm -f beamvr-app
docker build -t beamvr-app .
docker run -d -p 80:80 --name=beamvr-app --restart=always beamvr-app
echo "BeamVR app deployed successfully, localhost:80 is now serving the app."