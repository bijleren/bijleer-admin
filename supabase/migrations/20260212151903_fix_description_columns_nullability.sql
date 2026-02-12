/*
  # Fix Description and Instructions Column Nullability

  1. Changes
    - Allow NULL values for description columns in learning_games, physical_tasks, and writing_exercises
    - Allow NULL values for instructions columns in physical_tasks and writing_exercises
    - Add default empty string for all these columns to prevent insert errors
  
  2. Reason
    - Users are unable to edit descriptions/instructions due to NOT NULL constraint conflicts
    - Frontend code handles NULL values safely with optional chaining
    - This ensures data can be saved without requiring all fields to be filled

  3. Security
    - No RLS changes needed
    - Maintains existing table security policies
*/

-- Make description nullable and add default for learning_games
ALTER TABLE learning_games 
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN description SET DEFAULT '';

-- Make description and instructions nullable for physical_tasks (instructions already has default)
ALTER TABLE physical_tasks 
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN description SET DEFAULT '';

-- Make description and instructions nullable for writing_exercises (instructions already has default)
ALTER TABLE writing_exercises 
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN description SET DEFAULT '';
