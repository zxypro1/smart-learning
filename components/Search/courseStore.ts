import { create } from 'zustand';

interface CourseItem {
  course: string;
  charpter: number;
  charpter_title: string;
  content: string;
  type: number;
  status: string
}

interface CourseState {
  courseData: CourseItem[];
  setCourseData: (data: CourseItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  courseData: [],
  setCourseData: (data: CourseItem[]) => set((state) => ({ ...state, courseData: data })),
  isLoading: false,
  setIsLoading: (loading: boolean) => set((state) => ({ ...state, isLoading: loading })),
})); 