export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  // transient, composer side: used for preview + blob upload
  dataUrl?: string;
  file?: File;
  // persisted side: URL to the uploaded blob on the user's PDS
  url?: string;
};

export type Reflection = {
  id: string;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
};