<template lang='pug'>
  .strategy-builder
    .builder-header
      h2 Visual Strategy Builder
      p Create trading strategies without coding
    
    .builder-container
      .toolbox
        h3 Indicators
        .indicator-group
          .indicator-item(
            v-for="indicator in indicators"
            :key="indicator.name"
            draggable="true"
            @dragstart="onDragStart($event, indicator)"
          )
            i(:class="indicator.icon")
            span {{ indicator.name }}
        
        h3 Conditions
        .condition-group
          .condition-item(
            v-for="condition in conditions"
            :key="condition.name"
            draggable="true"
            @dragstart="onDragStart($event, condition)"
          )
            i(:class="condition.icon")
            span {{ condition.name }}
      
      .canvas-area
        .canvas(
          @dragover="onDragOver"
          @drop="onDrop"
          @click="selectNode"
        )
          .node(
            v-for="node in nodes"
            :key="node.id"
            :class="{ selected: selectedNode === node.id }"
            :style="{ left: node.x + 'px', top: node.y + 'px' }"
            @click.stop="selectNode(node.id)"
          )
            .node-header
              i(:class="node.icon")
              span {{ node.name }}
            .node-content
              .parameter(
                v-for="param in node.parameters"
                :key="param.name"
              )
                label {{ param.name }}
                input(
                  v-if="param.type === 'number'"
                  type="number"
                  v-model="param.value"
                  :step="param.step || 1"
                )
                select(
                  v-else-if="param.type === 'select'"
                  v-model="param.value"
                )
                  option(
                    v-for="option in param.options"
                    :key="option"
                    :value="option"
                  ) {{ option }}
      
      .properties-panel(v-if="selectedNode")
        h3 Properties
        .property-group
          .property(
            v-for="param in selectedNodeData.parameters"
            :key="param.name"
          )
            label {{ param.name }}
            input(
              v-if="param.type === 'number'"
              type="number"
              v-model="param.value"
              :step="param.step || 1"
            )
            select(
              v-else-if="param.type === 'select'"
              v-model="param.value"
            )
              option(
                v-for="option in param.options"
                :key="option"
                :value="option"
              ) {{ option }}
        
        .actions
          button.btn-danger(@click="deleteNode") Delete Node
          button.btn-primary(@click="testStrategy") Test Strategy
    
    .strategy-actions
      button.btn-primary(@click="saveStrategy") Save Strategy
      button.btn-secondary(@click="exportStrategy") Export
      button.btn-success(@click="deployStrategy") Deploy Strategy
</template>

<script>
export default {
  name: 'StrategyBuilder',
  data() {
    return {
      indicators: [
        { name: 'SMA', icon: 'fas fa-chart-line', type: 'indicator', parameters: [
          { name: 'Period', type: 'number', value: 20, step: 1 }
        ]},
        { name: 'EMA', icon: 'fas fa-chart-line', type: 'indicator', parameters: [
          { name: 'Period', type: 'number', value: 20, step: 1 }
        ]},
        { name: 'RSI', icon: 'fas fa-chart-line', type: 'indicator', parameters: [
          { name: 'Period', type: 'number', value: 14, step: 1 }
        ]},
        { name: 'MACD', icon: 'fas fa-chart-line', type: 'indicator', parameters: [
          { name: 'Fast Period', type: 'number', value: 12, step: 1 },
          { name: 'Slow Period', type: 'number', value: 26, step: 1 },
          { name: 'Signal Period', type: 'number', value: 9, step: 1 }
        ]}
      ],
      conditions: [
        { name: 'Greater Than', icon: 'fas fa-greater-than', type: 'condition', parameters: [
          { name: 'Value', type: 'number', value: 0 }
        ]},
        { name: 'Less Than', icon: 'fas fa-less-than', type: 'condition', parameters: [
          { name: 'Value', type: 'number', value: 0 }
        ]},
        { name: 'Crosses Above', icon: 'fas fa-arrow-up', type: 'condition', parameters: []},
        { name: 'Crosses Below', icon: 'fas fa-arrow-down', type: 'condition', parameters: []}
      ],
      nodes: [],
      selectedNode: null,
      nodeCounter: 0
    }
  },
  computed: {
    selectedNodeData() {
      return this.nodes.find(node => node.id === this.selectedNode);
    }
  },
  methods: {
    onDragStart(event, item) {
      event.dataTransfer.setData('application/json', JSON.stringify(item));
    },
    
    onDragOver(event) {
      event.preventDefault();
    },
    
    onDrop(event) {
      event.preventDefault();
      const item = JSON.parse(event.dataTransfer.getData('application/json'));
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.addNode(item, x, y);
    },
    
    addNode(item, x, y) {
      const node = {
        id: ++this.nodeCounter,
        name: item.name,
        icon: item.icon,
        type: item.type,
        parameters: JSON.parse(JSON.stringify(item.parameters)),
        x,
        y,
        connections: []
      };
      
      this.nodes.push(node);
      this.selectedNode = node.id;
    },
    
    selectNode(nodeId) {
      this.selectedNode = nodeId;
    },
    
    deleteNode() {
      if (this.selectedNode) {
        this.nodes = this.nodes.filter(node => node.id !== this.selectedNode);
        this.selectedNode = null;
      }
    },
    
    testStrategy() {
      // Generate strategy code from visual nodes
      const strategyCode = this.generateStrategyCode();
      console.log('Generated strategy:', strategyCode);
      
      // Here you would send the strategy to the backend for testing
      this.$emit('test-strategy', strategyCode);
    },
    
    saveStrategy() {
      const strategy = {
        name: 'Custom Strategy',
        nodes: this.nodes,
        code: this.generateStrategyCode()
      };
      
      this.$emit('save-strategy', strategy);
    },
    
    exportStrategy() {
      const strategy = {
        name: 'Custom Strategy',
        nodes: this.nodes,
        code: this.generateStrategyCode()
      };
      
      const dataStr = JSON.stringify(strategy, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'strategy.json';
      link.click();
    },
    
    deployStrategy() {
      const strategyCode = this.generateStrategyCode();
      this.$emit('deploy-strategy', strategyCode);
    },
    
    generateStrategyCode() {
      // Convert visual nodes to Gekko strategy code
      let code = `
module.exports = {
  name: 'Custom Strategy',
  description: 'Generated from Visual Strategy Builder',
  
  init: function() {
    // Initialize indicators
  },
  
  update: function(candle) {
    // Strategy logic
  },
  
  log: function() {
    // Logging
  }
};
      `;
      
      return code;
    }
  }
}
</script>

<style scoped>
.strategy-builder {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e222d;
  color: #d1d4dc;
}

.builder-header {
  padding: 1rem 2rem;
  background: #2a2e39;
  border-bottom: 1px solid #363a45;
}

.builder-header h2 {
  margin: 0;
  color: #00d4aa;
}

.builder-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.toolbox {
  width: 250px;
  background: #2a2e39;
  border-right: 1px solid #363a45;
  padding: 1rem;
  overflow-y: auto;
}

.toolbox h3 {
  color: #00d4aa;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.indicator-group,
.condition-group {
  margin-bottom: 2rem;
}

.indicator-item,
.condition-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: #363a45;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s ease;
}

.indicator-item:hover,
.condition-item:hover {
  background: #4a4e59;
  transform: translateY(-1px);
}

.indicator-item i,
.condition-item i {
  color: #00d4aa;
  width: 16px;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: #1e222d;
  background-image: 
    radial-gradient(circle, #2a2e39 1px, transparent 1px);
  background-size: 20px 20px;
}

.node {
  position: absolute;
  min-width: 150px;
  background: #2a2e39;
  border: 2px solid #363a45;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.node.selected {
  border-color: #00d4aa;
  box-shadow: 0 0 10px rgba(0, 212, 170, 0.3);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.node-header i {
  color: #00d4aa;
}

.node-content {
  font-size: 0.8rem;
}

.parameter {
  margin-bottom: 0.5rem;
}

.parameter label {
  display: block;
  margin-bottom: 0.25rem;
  color: #787b86;
}

.parameter input,
.parameter select {
  width: 100%;
  padding: 0.25rem;
  background: #1e222d;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
}

.properties-panel {
  width: 300px;
  background: #2a2e39;
  border-left: 1px solid #363a45;
  padding: 1rem;
  overflow-y: auto;
}

.properties-panel h3 {
  color: #00d4aa;
  margin-bottom: 1rem;
}

.property-group {
  margin-bottom: 1rem;
}

.property {
  margin-bottom: 1rem;
}

.property label {
  display: block;
  margin-bottom: 0.5rem;
  color: #787b86;
  font-size: 0.9rem;
}

.property input,
.property select {
  width: 100%;
  padding: 0.5rem;
  background: #1e222d;
  border: 1px solid #363a45;
  border-radius: 4px;
  color: #d1d4dc;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary,
.btn-success,
.btn-danger {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #00d4aa;
  color: #1e222d;
}

.btn-secondary {
  background: #787b86;
  color: #1e222d;
}

.btn-success {
  background: #26a69a;
  color: #1e222d;
}

.btn-danger {
  background: #ef5350;
  color: #1e222d;
}

.strategy-actions {
  padding: 1rem 2rem;
  background: #2a2e39;
  border-top: 1px solid #363a45;
  display: flex;
  gap: 1rem;
}
</style>
