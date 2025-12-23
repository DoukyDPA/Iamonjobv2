// ... (imports existants)
import MindMap from './pages/MindMap'; // NOUVEL IMPORT

// ... (dans AppRoutes)
<Route element={<Layout />}>
  
  {/* Dashboard */}
  <Route 
    path="/dashboard" 
    element={
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    } 
  />

  {/* NOUVELLE ROUTE : MIND MAP */}
  <Route 
    path="/mindmap" 
    element={
      <PrivateRoute>
        <MindMap />
      </PrivateRoute>
    } 
  />

  {/* ... (Les autres routes : cv-analysis, matching, chat restent là) ... */}
