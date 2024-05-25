import SpotifyFetcher from "spotifydl-core/dist/Spotify";
import getYtlink from "spotifydl-core/dist/lib/getYtlink";
import SpotifyDlError from 'spotifydl-core/dist/lib/Error';
import { downloadYT, downloadYTAndSave } from 'spotifydl-core/dist/lib/download';
import metadata from 'spotifydl-core/dist/lib/metadata';
import { promises, unlink } from 'fs-extra'

export class TheSpotifyTools extends SpotifyFetcher {
    downloadTrack = async <T extends undefined | string>(
        url: string,
        filename?: T
    ): Promise<T extends undefined ? Buffer : string> => {
        await this.verifyCredentials()
        const info = await this.getTrack(url)
        const link = await getYtlink(`${info.name} ${info.artists[0]} audio`)
        if (!link) throw new SpotifyDlError(`Couldn't get a download URL for the track: ${info.name}`)
        const data = await downloadYTAndSave(link, filename)
        await metadata(info, data)
        if (!filename) {
            const buffer = await promises.readFile(data)
            unlink(data)
            return buffer as any
        }
        return data as any
    }
}