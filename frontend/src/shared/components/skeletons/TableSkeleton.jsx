import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Generic Table Skeleton
 * @param {Array} columns Array of column configurations: { align, width, render(rowIndex, colIndex) }
 * @param {number} rowCount Number of skeleton rows to render
 * @param {boolean} alternateRows Whether to alternate row backgrounds
 */
export const TableSkeleton = ({
  columns = [],
  rowCount = 5,
  alternateRows = true,
  rowStyle = {},
  cellStyle = { padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
}) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr
          key={`table-skeleton-row-${rowIndex}`}
          style={{
            backgroundColor: alternateRows && rowIndex % 2 === 1 ? '#fafafa' : '#ffffff',
            ...rowStyle
          }}
        >
          {columns.map((col, colIndex) => {
            const align = col.align || 'left';
            return (
              <td
                key={`table-skeleton-col-${colIndex}`}
                style={{
                  ...cellStyle,
                  textAlign: align
                }}
              >
                {col.render ? (
                  col.render(rowIndex, colIndex)
                ) : (
                  <Skeleton
                    width={col.width || '80%'}
                    height={col.height || 16}
                    borderRadius={col.borderRadius || 4}
                    style={align === 'right' ? { marginLeft: 'auto' } : align === 'center' ? { margin: '0 auto' } : {}}
                  />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
