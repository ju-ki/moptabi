import React, { useState, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface DraggableHandleProps {
  id: string;
  isStart: boolean;
  isEnd: boolean;
}

export function DraggableHandle({ id, isStart, isEnd }: DraggableHandleProps) {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
  });

  // ドラッグ開始時にホバー状態をリセット
  useEffect(() => {
    if (isDragging) {
      setIsMouseOver(false);
    }
  }, [isDragging]);

  const getHandleStyle = () => {
    if (isDragging) {
      if (isStart) {
        return 'bg-blue-500 border-l-4 border-l-blue-700 shadow-lg transform scale-105';
      } else if (isEnd) {
        return 'bg-blue-500 border-r-4 border-r-blue-700 shadow-lg transform scale-105';
      } else {
        return 'bg-blue-500 border-2 border-blue-600 shadow-lg transform scale-105';
      }
    }

    // ドラッグ中でない場合のみホバー効果を適用
    if (isMouseOver && !isDragging) {
      if (isStart) {
        return 'bg-blue-300 border-l-4 border-l-blue-600 rounded-l-md cursor-grab active:cursor-grabbing hover:bg-blue-400 transition-colors';
      } else if (isEnd) {
        return 'bg-blue-300 border-r-4 border-r-blue-600 rounded-r-md cursor-grab active:cursor-grabbing hover:bg-blue-400 transition-colors';
      } else {
        return 'bg-blue-300 border-2 border-blue-500 cursor-grab active:cursor-grabbing hover:bg-blue-400 transition-colors';
      }
    }

    // 通常状態
    if (isStart) {
      return 'bg-blue-200 hover:bg-blue-300 border-l-2 border-l-blue-400 cursor-grab active:cursor-grabbing transition-colors';
    } else if (isEnd) {
      return 'bg-blue-200 hover:bg-blue-300 border-r-2 border-r-blue-400 cursor-grab active:cursor-grabbing transition-colors';
    } else {
      return 'bg-blue-200 hover:bg-blue-300 cursor-grab active:cursor-grabbing transition-colors';
    }
  };

  const getTooltipText = () => {
    if (isStart) {
      return '開始時間を調整';
    } else if (isEnd) {
      return '終了時間を調整';
    } else {
      return '全体の時間を調整';
    }
  };

  const handleMouseOver = () => {
    if (!isDragging) {
      setIsMouseOver(true);
    }
  };

  const handleMouseOut = () => {
    setIsMouseOver(false);
  };

  const handleMouseLeave = () => {
    setIsMouseOver(false);
  };

  return (
    <div
      draggable
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onMouseLeave={handleMouseLeave}
      className={`h-16 w-full transition-all duration-200 ease-in-out ${getHandleStyle()}`}
      title={getTooltipText()}
    />
  );
}

interface DroppableHandleProps {
  id: string;
  children: React.ReactNode;
}

export function DroppableHandle({ id, children }: DroppableHandleProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`w-20 h-16 flex items-center justify-center border-r border-gray-200 transition-all duration-200 ${
        isOver ? 'bg-blue-50 border-blue-300 shadow-inner' : 'hover:bg-gray-50'
      }`}
    >
      {children}
    </div>
  );
}
