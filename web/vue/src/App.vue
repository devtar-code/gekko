<script>

import top from './components/layout/header.vue'
import bottom from './components/layout/footer.vue'
import modal from './components/layout/modal.vue'

export default {
  name: 'app',
  components: {
    top,
    bottom,
    modal
  }
}
</script>

<template lang='pug'>
  #app
    top
    .main-content
      router-view.view
    bottom
    modal
</template>

<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  color: #2c3e50;
  line-height: 1.6;
}

#app {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.main-content {
  flex: 1;
  padding: 2rem 0;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.view {
  padding: 0 2rem;
}

.text {
  max-width: 500px;
}

input, select, textarea {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #00d4aa;
  box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
}

.params {
  min-height: 235px;
  line-height: 1.3em;
}

.hr {
  margin: 2rem 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e9ecef, transparent);
  border: none;
}

.contain {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.btn--primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 12px;
  margin-bottom: 12px;
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, #00d4aa 0%, #0099cc 100%);
  color: white;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
}

.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 212, 170, 0.4);
  color: white;
  text-decoration: none;
}

.btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 212, 170, 0.3);
}

.btn--secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 12px;
  margin-bottom: 12px;
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  background: white;
  color: #495057;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  border: 2px solid #e9ecef;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn--secondary:hover {
  border-color: #00d4aa;
  color: #00d4aa;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.btn--danger {
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
}

.btn--danger:hover {
  box-shadow: 0 6px 20px rgba(255, 71, 87, 0.4);
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f8f9fa;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.card-subtitle {
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0.25rem 0 0 0;
}

.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.grid-4 {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.flex {
  display: flex;
}

.flex-center {
  align-items: center;
  justify-content: center;
}

.flex-between {
  justify-content: space-between;
}

.flex-column {
  flex-direction: column;
}

.gap-1 { gap: 0.5rem; }
.gap-2 { gap: 1rem; }
.gap-3 { gap: 1.5rem; }

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.text-primary { color: #00d4aa; }
.text-secondary { color: #6c757d; }
.text-success { color: #28a745; }
.text-danger { color: #ff4757; }
.text-warning { color: #ffc107; }
.text-info { color: #17a2b8; }

.bg-primary { background-color: #00d4aa; }
.bg-secondary { background-color: #6c757d; }
.bg-success { background-color: #28a745; }
.bg-danger { background-color: #ff4757; }
.bg-warning { background-color: #ffc107; }
.bg-info { background-color: #17a2b8; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.badge-danger {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.badge-warning {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.badge-info {
  background: rgba(23, 162, 184, 0.1);
  color: #17a2b8;
}

.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #00d4aa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0;
  }
  
  .view {
    padding: 0 1rem;
  }
  
  .contain {
    padding: 0 1rem;
  }
  
  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
  }
  
  .btn--primary,
  .btn--secondary {
    width: 100%;
    justify-content: center;
    margin-right: 0;
  }
}
</style>
