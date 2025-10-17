import { Route, Routes, Link } from 'react-router-dom'
import SplashScreen from './pages/SplashScreen'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Register from './pages/Register'
import Profile from './pages/Profile'
import AuthModal from './components/AuthModal'
import Menu from './pages/Menu'
import CreationPage from './pages/CreationPage'
import Login from './pages/Login'
import './App.css'

function App() {


  return (
    <div>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path='/splashscreen' element={<SplashScreen />} />
        <Route path='/login' element={<Login/>}/>
        <Route path='/menu' element={<Menu/>}/>
        <Route path='/auth' element={<AuthModal/>}/>
        <Route path="/home" element={<Home />} />
        <Route path="/create" element={<CreationPage/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
      </Routes>


    </div>
  )
}

export default App
