import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

type Task = {
    id: string;
    title: string;
    dueDate: string;
    hoursRequired: number;
    isEditing: boolean;
    completed: boolean;
};

type Column = {
    name: string;
    tasks: Task[];
};

const initialColumns: { [key: string]: Column } = {
    'due-today': { name: 'Due Today', tasks: [] },
    'due-tomorrow': { name: 'Due Tomorrow', tasks: [] },
    'later': { name: 'Later', tasks: [] },
    'completed': { name: 'Completed', tasks: [] },
};

export default function App() {
  const [columns, setColumns] = useState<{ [key: string]: Column }>({ ...initialColumns });
  const [newTask, setNewTask] = useState<Task>({ id: '', title: '', dueDate: '', hoursRequired: 0, isEditing: false, completed: false });

  useEffect(() => {
      const storedColumns = localStorage.getItem('columns');
      if (storedColumns) {
          setColumns(JSON.parse(storedColumns));
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('columns', JSON.stringify(columns));
  }, [columns]);

  const columnOrder = ['due-today', 'due-tomorrow', 'later', 'completed']; 
  
  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceTasks = Array.from(sourceColumn.tasks);
    const [removed] = sourceTasks.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          tasks: sourceTasks,
        },
      });
    } else {
      const destTasks = Array.from(destColumn.tasks);
      destTasks.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          tasks: sourceTasks,
        },
        [destination.droppableId]: {
          ...destColumn,
          tasks: destTasks,
        },
      });
    }
  };

  const addTask = () => {
    if (!newTask.title) return;
    const newTaskWithId = { ...newTask, id: uuidv4(), isEditing: false };
    const column = columns['due-today']; 
    column.tasks.push(newTaskWithId);
    setColumns({ ...columns, ['due-today']: column });
    setNewTask({ id: '', title: '', dueDate: '', hoursRequired: 0, isEditing: false, completed: false });
  };

  const toggleEdit = (columnId: string, index: number) => {
    const updatedColumns = { ...columns };
    const task = updatedColumns[columnId].tasks[index];
    if (!task.isEditing) {
      task.isEditing = true;
      setColumns(updatedColumns);
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    columnId: string,
    taskIndex: number,
    field: keyof Task
  ) => {
    const updatedColumns = { ...columns };
    const task = { ...updatedColumns[columnId].tasks[taskIndex] };

    if (field === 'hoursRequired') {
      task.hoursRequired = parseInt(event.target.value, 10) || 0;
    } else if (field === 'title') {
      task.title = event.target.value;
    } else if (field === 'dueDate') {
      task.dueDate = event.target.value;
    }

    updatedColumns[columnId].tasks[taskIndex] = task;
    setColumns(updatedColumns);
  };

  const finishEdit = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, columnId: string, taskIndex: number) => {
    event.stopPropagation();
    const updatedColumns = { ...columns };
    const task = updatedColumns[columnId].tasks[taskIndex];
    task.isEditing = false;
    setColumns(updatedColumns);
  };

  const toggleComplete = (columnId: string, taskIndex: number) => {
    const updatedColumns = { ...columns };
    const task = updatedColumns[columnId].tasks[taskIndex];
    task.completed = !task.completed;

    updatedColumns[columnId].tasks.splice(taskIndex, 1); 

    if (task.completed) {
      updatedColumns['completed'].tasks.unshift(task); 
    } else {
      updatedColumns['due-today'].tasks.push(task);
    }

    setColumns(updatedColumns);
  };

  const getTotalHours = (column: Column) => {
      return column.tasks.reduce((total, task) => total + task.hoursRequired, 0);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, columnId: string, taskIndex: number) => {
    event.stopPropagation();
    toggleComplete(columnId, taskIndex);
  };

  return (
    <div className="font-bold p-4 h-screen bg-gray-50 flex flex-col">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-grow space-x-2 overflow-x-auto">
          {columnOrder.map(columnId => {
            const column = columns[columnId];
            return (
              <Droppable key={columnId} droppableId={columnId}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-none w-60 bg-gray-200 p-4 rounded shadow flex flex-col"
                  style={{ minHeight: '50vh' }}
                >
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">{column.name}</h2>
                  <div className="flex-grow">
                    {column.tasks.map((task, taskIndex) => (
                      <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-2 mb-2 rounded shadow text-gray-800"
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleComplete(columnId, taskIndex);
                                }}
                                className="mr-2"
                              />
                              <div onClick={() => toggleEdit(columnId, taskIndex)}>
                                <p className={`text-lg ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                              </div>
                            </div>
                            {task.isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => handleInputChange(e, columnId, taskIndex, 'title')}
                                  className="border p-1 mb-2 rounded text-lg w-full"
                                />
                                <input
                                  type="date"
                                  value={task.dueDate}
                                  onChange={(e) => handleInputChange(e, columnId, taskIndex, 'dueDate')}
                                  className="border p-1 mb-2 rounded text-lg w-full"
                                />
                                <input
                                  type="number"
                                  value={task.hoursRequired.toString()}
                                  onChange={(e) => handleInputChange(e, columnId, taskIndex, 'hoursRequired')}
                                  className="border p-1 mb-2 rounded text-lg w-full"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    finishEdit(e, columnId, taskIndex);
                                  }}
                                  className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-lg w-full"
                                >
                                  Finish
                                </button>
                              </>
                            ) : (
                              <div>
                                <p className="text-sm">Due: {task.dueDate}</p>
                                <p className="text-sm">Hours: {task.hoursRequired}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  <div className="text-right">
                              <span className="text-sm font-semibold">Total Hours: {getTotalHours(column)}</span>
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
        </div>
      </DragDropContext>
      <div className="mt-auto p-4 bg-white">
        <input
          type="text"
          placeholder="Task Title"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="border p-1 mr-2 rounded text-lg"
        />
        <input
          type="date"
          placeholder="Due Date"
          value={newTask.dueDate}
          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          className="border p-1 mr-2 rounded text-lg"
        />
        <input
          type="number"
          placeholder="Hours Required"
          value={newTask.hoursRequired.toString()}
          onChange={(e) => setNewTask({ ...newTask, hoursRequired: parseInt(e.target.value, 10) || 0 })}
          className="border p-1 mr-2 rounded text-lg"
        />
        <button
          onClick={addTask}
          className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded text-lg"
        >
          Add Task
        </button>
      </div>
    </div>
  );
}