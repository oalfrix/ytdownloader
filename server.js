const express = require('express');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const app = express();
const PORT = 3000;

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/convert', async (req, res) => {
    const url = req.body.url;

    if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    let info;
    try {
        info = await ytdl.getInfo(url);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch video information' });
    }

    const format = 'mp3';
    const fileName = `${info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
    const filePath = path.resolve(__dirname, 'output', fileName);

    if (!fs.existsSync(path.resolve(__dirname, 'output'))) {
        fs.mkdirSync(path.resolve(__dirname, 'output'));
    }

    ffmpeg(ytdl(url, { filter: 'audioonly' }))
        .audioBitrate(128)
        .toFormat(format)
        .save(filePath)
        .on('end', () => {
            return res.json({ downloadUrl: `/download/${fileName}` });
        })
        .on('error', (err) => {
            console.error(err);
            return res.status(500).json({ error: 'Failed to convert video' });
        });
});

app.get('/download/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.resolve(__dirname, 'output', fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
z