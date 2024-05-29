import { RequestPaging } from '@/types';

export type GetUserProps = RequestPaging & {
  searchText?: string;
};
