import { Injectable } from "@nestjs/common";
import PinataSDK from "@pinata/sdk";
import { Readable } from "stream";

@Injectable()
export class UploadService {
  private pinata = new PinataSDK({
    pinataApiKey: process.env.PINATA_API_KEY!,
    pinataSecretApiKey: process.env.PINATA_SECRET_KEY!,
  });

  async uploadToIpfs(file: Express.Multer.File) {
    const stream = Readable.from(file.buffer);
    const result = await this.pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: file.originalname },
    });

    return {
      cid: result.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    };
  }
}
