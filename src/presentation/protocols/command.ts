export interface Command {
  handle: (data: any) => Promise<void>;
}
