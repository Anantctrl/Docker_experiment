export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: Date;
}
