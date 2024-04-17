import axios from "axios";
import fs from 'fs';
import Spotify from 'spotifydl-core';
import SpotifyWebApi from 'spotify-web-api-node';
import type { SpotifyLoginOptions } from "../interface/Spotify";
import type SpotifyFetcher from "spotifydl-core/dist/Spotify";
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import { MusicErrorType } from "../enum/Error";

export class Music {
    private spotifyApi?: SpotifyWebApi;
    private spotifyDl?: SpotifyFetcher;

    constructor() {

    }

    private async makeAccessToken(clientId: string, clientSecret: string) {
        try {
            const response = await axios.post('https://accounts.spotify.com/api/token', {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data.access_token;
        } catch (error) {
            return null;
        }
    }

    async spotifyLogin(options?: SpotifyLoginOptions) {
        this.spotifyApi = new SpotifyWebApi();

        if (options?.clientId && options?.clientSecret) {
            const accessToken = await this.makeAccessToken(options.clientId, options.clientSecret);

            this.spotifyApi.setAccessToken(accessToken);
            this.spotifyDl = new Spotify({ clientId: options.clientId, clientSecret: options.clientSecret });
        } else {
            throw new MusicError(MusicErrorType.NotLoginSpotify);
        }
    }

    async searchYoutube(query: string): Promise<ytsr.Video | undefined> {
        const searchResults = (await ytsr(query, { limit: 5 })).items;

        let videoItem;

        for (const item of searchResults) {
            if (item.type !== 'video') continue;

            videoItem = item;
            break;
        }

        return videoItem;
    }

    async searchSpotify(query: string): Promise<SpotifyApi.TrackObjectFull | undefined> {
        if (this.spotifyApi) {
            const searchResults = (await this.spotifyApi.searchTracks(query, { limit: 1 })).body.tracks?.items[0];

            return searchResults
        } else {
            throw new MusicError(MusicErrorType.NotLoginSpotify);
        }
    }

    async getYoutubeVideo(id: string): Promise<ytdl.MoreVideoDetails | undefined> {
        const videoInfo = (await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${id}`)).videoDetails;

        return videoInfo
    }

    async getSpotifyTrack(id: string): Promise<SpotifyApi.SingleTrackResponse | undefined> {
        if (this.spotifyApi) {
            const trackInfo = (await this.spotifyApi.getTrack(id)).body;

            return trackInfo
        } else {
            throw new MusicError(MusicErrorType.NotLoginSpotify);
        }
    }

    async downloadSpotifyTrackToFilename(id: string, filename: string): Promise<string | undefined> {
        if (this.spotifyDl) {
            const download = await this.spotifyDl.downloadTrack(`https://open.spotify.com/track/${id}`, filename);

            return download
        } else {
            throw new MusicError(MusicErrorType.NotLoginSpotify);
        }
    }

    async downloadSpotifyTrack(id: string): Promise<string | Buffer | undefined> {
        if (this.spotifyDl) {
            const buffer = await this.spotifyDl.downloadTrack(`https://open.spotify.com/track/${id}`);

            return buffer
        } else {
            throw new MusicError(MusicErrorType.NotLoginSpotify);
        }
    }

    async downloadYoutubeVideo(id: string): Promise<Buffer | undefined> {
        const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
        const format = ytdl.chooseFormat(videoInfo.formats, { quality: "highestaudio", filter: 'audioonly' });
        const videoReadableStream = ytdl.downloadFromInfo(videoInfo, { format: format });

        const dataChunks: Buffer[] = [];

        videoReadableStream.on('data', (chunk) => {
            dataChunks.push(chunk);
        });

        return new Promise<Buffer>((resolve, reject) => {
            videoReadableStream.on('end', () => {
                const buffer = Buffer.concat(dataChunks);
                resolve(buffer);
            });

            videoReadableStream.on('error', (error) => {
                reject(error);
            });
        });
    }

    async downloadYoutubeVideoToFilename(id: string, filename: string): Promise<any | undefined> {
        const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);

        const format = ytdl.chooseFormat(videoInfo.formats, { quality: "highestaudio", filter: 'audioonly' });

        const download = ytdl.downloadFromInfo(videoInfo, { format: format }).pipe(fs.createWriteStream(filename));

        return download;
    }
}

export class MusicError extends Error {
    errorCode: MusicErrorType;
    constructor (code: MusicErrorType) {
        super();
        this.errorCode = code;

        if (Error.captureStackTrace) Error.captureStackTrace(this, MusicError);
    }
}