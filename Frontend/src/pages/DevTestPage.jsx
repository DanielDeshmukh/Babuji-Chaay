import React, { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";
import Footer from "../components/Footer";
import useCurrentUser from "@/hooks/useCurrentUser";

// --- PLACEHOLDER COMPONENTS ---
const Button = ({ onClick, children, className = "bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded text-xs transition-colors shadow-md" }) => (
  <button onClick={onClick} className={className}>
    {children}
  </button>
);

const EditRowModal = ({ isOpen, onClose, rowData, tableName, tableColumns, onSave }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Convert any object/JSON data to string for textarea before setting state
    const processedData = {};
    if (rowData) {
        Object.keys(rowData).forEach(key => {
            const val = rowData[key];
            if (val && typeof val === 'object' && !Array.isArray(val) && val !== null) {
                processedData[key] = JSON.stringify(val, null, 2);
            } else {
                processedData[key] = val;
            }
        });
    }
    setFormData(processedData);
  }, [rowData]);

  if (!isOpen || !rowData) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let typedValue = value;

    if (type === 'checkbox') {
        typedValue = checked;
    } 
    // Simple coercion for number inputs (for now, let complex types be strings)
    else if (type === 'number' && !isNaN(Number(value)) && value !== '') {
        typedValue = Number(value);
    } else if (value === '') {
        typedValue = null;
    }

    setFormData((prev) => ({ ...prev, [name]: typedValue }));
  };

  const handleSave = () => {
    const finalData = {};
    
    // Process formData: attempt to parse JSON/objects back to their original type if they were strings in the form
    Object.keys(formData).forEach(key => {
        let value = formData[key];
        
        // If the original data for this column was an object (or we assume it might be a JSON field)
        const originalValue = rowData[key];
        if (typeof originalValue === 'object' && originalValue !== null || (value && typeof value === 'string' && value.startsWith('{'))) {
            try {
                // Attempt to parse the string back into a JSON object
                finalData[key] = JSON.parse(value);
            } catch (e) {
                // If parsing fails, treat it as a string
                finalData[key] = value;
                console.warn(`Could not parse JSON for column ${key}. Saving as string.`);
            }
        } else {
            finalData[key] = value;
        }
    });

    onSave(finalData);
    onClose();
  };

  // Filter out system fields: 'id', 'user_id', 'created_at', 'updated_at'
  const editableColumns = tableColumns.filter(col => 
    col !== 'id' && 
    col !== 'user_id' && 
    col !== 'created_at' && 
    col !== 'updated_at' // Assuming standard Supabase columns
  );

  const getInputField = (col, value) => {
    if (value === null) value = ""; // Normalize null for input value
    const isNewRow = rowData.id === 'NEW_ROW';
    
    // Determine the type based on the initial rowData, or guess for new rows
    let inputType = 'text';
    const originalValue = rowData[col];
    const initialType = isNewRow ? typeof value : typeof originalValue;
    
    if (initialType === 'number') {
        inputType = 'number';
    } else if (initialType === 'boolean' || originalValue === true || originalValue === false) {
        inputType = 'checkbox';
    } else if (initialType === 'object' || (typeof value === 'string' && (value.includes('{') || value.includes('[')))) {
        // Use a textarea for JSON/complex objects
        return (
            <textarea
                name={col}
                rows="4"
                value={formData[col] === null ? '' : String(formData[col])}
                onChange={handleChange}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground font-mono text-xs"
            />
        );
    }
    
    if (inputType === 'checkbox') {
        return (
            <input
                type="checkbox"
                name={col}
                checked={!!formData[col]} // Use !! for boolean check
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-border rounded focus:ring-blue-500"
            />
        );
    }


    return (
        <input
            type={inputType}
            name={col}
            value={formData[col] === null ? '' : String(formData[col])}
            onChange={handleChange}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
        />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg w-full max-w-lg shadow-2xl border border-border">
        <h3 className="text-xl font-bold mb-6 capitalize text-center">
            {rowData.id === 'NEW_ROW' ? `Add New ${tableName.replace(/_/g, " ")}` : `Edit ${tableName.replace(/_/g, " ")} Row`}
        </h3>
        
        {editableColumns.length === 0 ? (
            <p className="text-center text-muted-foreground">
                No editable columns found.
            </p>
        ) : (
            <div className="space-y-4">
                {editableColumns.map(col => (
                    <div key={col}>
                        <label className="block text-sm font-medium mb-1 capitalize text-muted-foreground">
                            {col.replace(/_/g, " ")}:
                        </label>
                        {getInputField(col, rowData[col])}
                    </div>
                ))}
            </div>
        )}

        <div className="mt-8 flex justify-end space-x-3">
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
        </div>
      </div>
    </div>
  );
};
// --- END PLACEHOLDER COMPONENTS ---


const DevTestPage = () => {
  const { user, loading: userLoading } = useCurrentUser();

  const tableList = [
    "billing_items",
    "daily_sales_summary",
    "offers",
    "products",
    "profiles",
    "special_numbers",
    "todays_menu",
    "transactions",
  ];

  const initialTablesState = Object.fromEntries(tableList.map((t) => [t, []]));
  const [tables, setTables] = useState(initialTablesState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for the editing modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState(null);
  const [currentEditTable, setCurrentEditTable] = useState(null);

  // --- Data Fetching Logic ---
  const getFilter = useCallback((table, userId) => {
    return table === "profiles"
      ? { column: "id", value: userId }
      : { column: "user_id", value: userId };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const updatedTables = {};

      for (const table of tableList) {
        const filter = getFilter(table, user.id);

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(filter.column, filter.value);

        if (error) throw error;
        updatedTables[table] = data || [];
      }

      setTables(updatedTables);
    } catch (err) {
      console.error("Error fetching dev test data:", err.message || err);
      setError("Failed to fetch data: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, [user, getFilter]);

  useEffect(() => {
    if (!user || userLoading) return;
    fetchAll();
  }, [user, userLoading, fetchAll]);

  // --- CUD Operations ---

  const handleDelete = async (table, rowId) => {
    if (!window.confirm(`Are you sure you want to delete row ${rowId} from ${table}? This cannot be undone.`)) {
      return;
    }

    try {
      const filter = getFilter(table, user.id);
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', rowId)
        .eq(filter.column, filter.value); // Crucial RLS-check equivalent

      if (error) throw error;

      // Optimistic update
      setTables(prev => ({
        ...prev,
        [table]: prev[table].filter(row => row.id !== rowId)
      }));

    } catch (err) {
      console.error("Error deleting row:", err.message || err);
      alert(`Error deleting: ${err.message || String(err)}`);
    }
  };
  
  const handleEdit = (table, row) => {
    setCurrentEditTable(table);
    setCurrentEditRow(row);
    setIsModalOpen(true);
  };
  
  const handleNew = (table) => {
    setCurrentEditTable(table);
    // Use the keys of the first row or fallback keys for a new object
    const columns = tables[table][0] ? Object.keys(tables[table][0]) : ['id', 'user_id', 'name', 'description', 'value'];
    
    const newRow = columns.reduce((acc, col) => {
      if (col === 'user_id' && table !== 'profiles') acc[col] = user.id;
      else if (col === 'id') acc[col] = 'NEW_ROW'; // Temporary ID for insert detection
      else if (col === 'created_at' || col === 'updated_at') acc[col] = new Date().toISOString();
      else acc[col] = null;
      return acc;
    }, {});

    if (table === 'profiles') newRow.id = user.id;

    setCurrentEditRow(newRow);
    setIsModalOpen(true);
  };

  const handleSave = async (updatedRowData) => {
    const table = currentEditTable;
    const isNew = updatedRowData.id === 'NEW_ROW';

    try {
      let result;
      
      const dataToSave = { ...updatedRowData };
      if (isNew) delete dataToSave.id;

      if (isNew) {
        // --- INSERT (Create) ---
        if (table !== 'profiles') dataToSave.user_id = user.id;

        result = await supabase
          .from(table)
          .insert([dataToSave])
          .select()
          .single();

      } else {
        // --- UPDATE ---
        const filter = getFilter(table, user.id);
        
        result = await supabase
          .from(table)
          .update(dataToSave)
          .eq('id', updatedRowData.id)
          .eq(filter.column, filter.value) 
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      await fetchAll();
      
      console.log(`Successfully ${isNew ? 'inserted' : 'updated'} row in ${table}`);

    } catch (err) {
      console.error(`Error ${isNew ? 'inserting' : 'updating'} row:`, err.message || err);
      alert(`Error ${isNew ? 'inserting' : 'updating'}: ${err.message || String(err)}`);
    }
  };

  // --- Render Functions ---

  if (loading || userLoading)
    return (
      <p className="text-center mt-6 text-foreground">
        Loading all tables...
      </p>
    );

  if (error) {
    return (
      <p className="text-center mt-6 text-red-500">
        Error: {error}
      </p>
    );
  }

  const renderTable = (table, data) => {
    if (!data || data.length === 0) {
      return (
        <p className="text-muted-foreground italic p-4">No data found for this user in this table.</p>
      );
    }
    
    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left border-b border-border capitalize whitespace-nowrap font-medium text-xs text-muted-foreground"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
              <th className="px-3 py-2 text-center border-b border-border font-medium text-xs text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50 border-b border-border last:border-b-0">
                {Object.keys(row).map((col, i) => {
                    const val = row[col];
                    const displayValue = typeof val === "object" && val !== null
                        ? JSON.stringify(val)
                        : String(val);

                    return (
                        <td
                            key={i}
                            className="px-3 py-2 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                            title={displayValue}
                        >
                            {displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue}
                        </td>
                    );
                })}
                <td className="px-3 py-2 whitespace-nowrap flex space-x-2 justify-center">
                  <Button onClick={() => handleEdit(table, row)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-none">Edit</Button>
                  <Button onClick={() => handleDelete(table, row.id)} className="bg-red-600 hover:bg-red-700 text-white shadow-none">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      {/* User Info */}
      {user && (
        <div className="absolute top-2 right-2 bg-gray-200 text-gray-800 text-xs px-3 py-1 rounded-md shadow-sm border border-gray-300">
          User ID: **{user.id}** | Email: **{user.email || "Unknown"}**
        </div>
      )}

      <main className="flex-grow px-4 py-6 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-center text-primary">Supabase Data Management Tool</h1>
        
        <div className="mb-8 text-center">
             <Button onClick={fetchAll} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2">
                 Refresh All Tables Data
             </Button>
        </div>
        
        {tableList.map((table) => (
          <div
            key={table}
            className="mb-12 p-6 bg-card rounded-xl border border-border shadow-lg"
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-border">
                <h2 className="text-2xl font-semibold capitalize">
                    {table.replace(/_/g, " ")}
                </h2>
                <Button onClick={() => handleNew(table)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                    + Add New Row
                </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Rows: **{tables[table]?.length}** (Filtered by **{table === "profiles" ? "ID" : "User ID"}**)
            </p>

            {renderTable(table, tables[table])}
          </div>
        ))}
      </main>

      <Footer />
      
      {/* Editing Modal */}
      <EditRowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rowData={currentEditRow}
        tableName={currentEditTable}
        tableColumns={currentEditRow ? Object.keys(currentEditRow) : []}
        onSave={handleSave}
      />
    </div>
  );
};

export default DevTestPage;