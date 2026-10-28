export interface TaskUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface TaskProject {
  id: string;
  name: string;
}

export interface TaskResponse {
  id: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  isArchived: boolean;
  assignee: TaskUser | null;
  creator: TaskUser;
  project: TaskProject;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
