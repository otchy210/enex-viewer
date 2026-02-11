export interface AsyncDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const getAsyncErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export const createAsyncIdleState = <T>(loading = false): AsyncDataState<T> => ({
  data: null,
  error: null,
  loading
});

export const createAsyncLoadingState = <T>(): AsyncDataState<T> => ({
  data: null,
  error: null,
  loading: true
});

export const createAsyncSuccessState = <T>(data: T): AsyncDataState<T> => ({
  data,
  error: null,
  loading: false
});

export const createAsyncErrorState = <T>(error: unknown): AsyncDataState<T> => ({
  data: null,
  error: getAsyncErrorMessage(error),
  loading: false
});
