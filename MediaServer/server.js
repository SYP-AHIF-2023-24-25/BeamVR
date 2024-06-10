const NodeMediaServer = require('node-media-server');

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*',
        mediaroot: './media',
        webroot: './www',
        cache: false,
        hls: true,
        hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]'
    },
    trans: {
        ffmpeg: '/usr/bin/ffmpeg',
        tasks: [
            {
                app: 'live',
                hls: true,
                hlsFlags: '[hls_time=1:hls_list_size=3:hls_flags=delete_segments]',
                restart_on_error: true,
            }
        ]
    }
};

const nms = new NodeMediaServer(config);
nms.run();

nms.on('postConnect', (id, args) => {
    console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});
nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`, `Timestamp: ${new Date().toISOString()}`);
});
nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`, `Timestamp: ${new Date().toISOString()}`);
});
nms.on('doneConnect', (id, args) => {
    console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

const express = require('express');
const app = express();
const port = 3000;
app.use(express.static(__dirname + '/public'));
app.listen(port, () => {
    console.log(`MediaServer listening at http://localhost:${port}`);
});
