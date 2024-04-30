export interface IQueryLoader {
  loadQueries: () => Promise<Record<string, string[]>>;
}
