/**
 * IPFS Service
 * Handles immutable storage of files and metadata
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { AppError } from '../api/middleware/error-handler.js';

export class IPFSService {
  private apiClient: AxiosInstance;
  private gatewayUrl: string;

  constructor() {
    const apiUrl = process.env.IPFS_API_URL || 'http://localhost:5001';
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';

    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Upload file to IPFS
   * @param file - File buffer to upload
   * @param metadata - Optional metadata object
   * @returns IPFS CID (Content Identifier)
   */
  async upload(file: Buffer, metadata?: Record<string, unknown>): Promise<string> {
    logger.info('Uploading to IPFS', { size: file.length, hasMetadata: !!metadata });

    try {
      // Create FormData for multipart upload
      const FormData = (await import('form-data')).default;
      const form = new FormData();

      form.append('file', file, {
        filename: `file_${Date.now()}`,
        contentType: 'application/octet-stream',
      });

      if (metadata) {
        form.append('metadata', JSON.stringify(metadata));
      }

      // Upload to IPFS
      const response = await this.apiClient.post('/api/v0/add', form, {
        headers: form.getHeaders(),
      });

      const cid = response.data.Hash || response.data.cid;

      if (!cid) {
        throw new Error('No CID returned from IPFS');
      }

      logger.info('File uploaded to IPFS successfully', { cid });

      return cid;
    } catch (error) {
      logger.error('IPFS upload failed', error as Error);

      // If IPFS is not available, generate a mock CID
      // In production, this should throw an error
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Using mock IPFS CID (development mode)');
        return `mock_cid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      throw new AppError(
        'Failed to upload to IPFS. Please check IPFS configuration.',
        500,
        'IPFS_ERROR'
      );
    }
  }

  /**
   * Retrieve file from IPFS
   * @param cid - IPFS Content Identifier
   * @returns File buffer
   */
  async retrieve(cid: string): Promise<Buffer> {
    logger.info('Retrieving from IPFS', { cid });

    try {
      // Use gateway URL for retrieval
      const url = `${this.gatewayUrl}${cid}`;

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      logger.info('File retrieved from IPFS successfully', { cid, size: response.data.length });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('IPFS retrieval failed', error as Error, { cid });
      throw new AppError('Failed to retrieve from IPFS', 500, 'IPFS_ERROR');
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `${this.gatewayUrl}${cid}`;
  }
}
