import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.jsx'
import { KeyboardProvider } from './components/KeyboardProvider';


ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StrictMode>
      <KeyboardProvider>
      <App />
      </KeyboardProvider>
    </StrictMode>
  </BrowserRouter>
)
