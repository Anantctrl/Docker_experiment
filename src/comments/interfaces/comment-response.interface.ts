export interface CommentAuthor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface CommentResponse {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  author: CommentAuthor;
  createdAt: Date;
  updatedAt: Date;
}
