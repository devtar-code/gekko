<template lang='pug'>
  div
    #top
    header.professional-header
      .header-container
        .logo-section
          .logo
            i.fas.fa-chart-line
            span.logo-text Gekko Pro
          .version-badge v{{ version.gekko }}
        .nav-section
          .nav-item(:class="{ active: $route.path === '/home' }")
            router-link(to='/home')
              i.fas.fa-home
              span Dashboard
          .nav-item(:class="{ active: $route.path === '/live-gekkos' }")
            router-link(to='/live-gekkos')
              i.fas.fa-play-circle
              span Live Trading
          .nav-item(:class="{ active: $route.path === '/backtest' }")
            router-link(to='/backtest')
              i.fas.fa-chart-bar
              span Backtest
          .nav-item(:class="{ active: $route.path === '/data' }")
            router-link(to='/data')
              i.fas.fa-database
              span Data
          .nav-item(:class="{ active: $route.path === '/config' }")
            router-link(to='/config')
              i.fas.fa-cog
              span Settings
        .user-section
          .status-indicator
            .status-dot.online
            span.status-text Connected
          .help-link
            a(href='https://gekko.wizb.it/docs/introduction/about_gekko.html', target='_blank')
              i.fas.fa-question-circle
              span Help

</template>

<script>
const gekkoPackage = require('../../../../../package.json');

export default {
  data: () => {
    return {
      version: {
        gekko: gekkoPackage.version
      }
    }
  }
}
</script>

<style>
.professional-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 70px;
  max-width: 1400px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.logo i {
  color: #00d4aa;
  font-size: 1.8rem;
}

.logo-text {
  background: linear-gradient(45deg, #00d4aa, #0099cc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version-badge {
  background: rgba(255,255,255,0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.nav-section {
  display: flex;
  align-items: center;
  gap: 0;
}

.nav-item {
  position: relative;
  transition: all 0.3s ease;
}

.nav-item a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
}

.nav-item a:hover {
  color: white;
  background: rgba(255,255,255,0.1);
}

.nav-item.active a {
  color: white;
  border-bottom-color: #00d4aa;
}

.nav-item i {
  font-size: 1.1rem;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00d4aa;
  animation: pulse 2s infinite;
}

.status-dot.online {
  background: #00d4aa;
}

.status-dot.offline {
  background: #ff4757;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.help-link a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.help-link a:hover {
  color: white;
}

@media (max-width: 768px) {
  .header-container {
    padding: 0 1rem;
    flex-wrap: wrap;
    height: auto;
    padding: 1rem;
  }
  
  .nav-section {
    order: 3;
    width: 100%;
    margin-top: 1rem;
    justify-content: center;
  }
  
  .nav-item a {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  .nav-item span {
    display: none;
  }
}
</style>
