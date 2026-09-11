export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type Reflection = {
  id: string;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
};