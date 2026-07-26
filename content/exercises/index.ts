import type { Exercise } from '@/lib/rust/types';
import { module1Exercises } from './module1';
import { module2Exercises } from './module2';
import { module3Exercises } from './module3';
import { module4Exercises } from './module4';
import { module5Exercises } from './module5';
import { module6Exercises } from './module6';
import { module7Exercises } from './module7';
import { module8Exercises } from './module8';

export const allExercises: Exercise[] = [...module1Exercises, ...module2Exercises, ...module3Exercises, ...module4Exercises, ...module5Exercises, ...module6Exercises, ...module7Exercises, ...module8Exercises];

export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find((exercise) => exercise.id === id);
}

export function exercisesByModule(moduleId: string): Exercise[] {
  return allExercises.filter((exercise) => exercise.moduleId === moduleId);
}

export interface ExerciseNav {
  moduleId: string;
  index: number;
  total: number;
  prevId?: string;
  nextId?: string;
}

export function exerciseNav(exerciseId: string): ExerciseNav | undefined {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return undefined;

  const exercises = exercisesByModule(exercise.moduleId);
  const index = exercises.findIndex((candidate) => candidate.id === exerciseId);

  return {
    moduleId: exercise.moduleId,
    index,
    total: exercises.length,
    prevId: index > 0 ? exercises[index - 1].id : undefined,
    nextId: index < exercises.length - 1 ? exercises[index + 1].id : undefined,
  };
}
