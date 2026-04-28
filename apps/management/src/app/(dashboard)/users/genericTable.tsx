import React from "react";

interface TableColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode; // optional custom cell renderer
  width?: string;
}

interface GenericTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
}

export function GenericTable<T>({
  columns,
  data,
  page,
  totalPages,
  setPage,
}: GenericTableProps<T>) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2 text-left"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length > 0 && (
        <div className="flex justify-between items-center border-t px-4 py-2">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
