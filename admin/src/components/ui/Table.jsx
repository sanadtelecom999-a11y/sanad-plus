import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function Table({ columns, data, loading, onRowClick, emptyTitle = 'لا توجد بيانات', emptyDescription, rowKey = (row, i) => row.id ?? i }) {
  if (loading) return <div className="flex items-center justify-center py-16 text-muted"><Spinner size={32} /><span className="mr-3">جارٍ التحميل...</span></div>;
  if (!data || data.length === 0) return <EmptyState icon="📋" title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full text-sm text-right">
        <thead className="border-b border-border">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="py-3 px-3 font-semibold text-muted whitespace-nowrap">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={rowKey(row, i)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`border-b border-border/50 ${onRowClick ? 'cursor-pointer hover:bg-surface-light' : ''}`}>
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-3">{col.render ? col.render(row) : row[col.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
