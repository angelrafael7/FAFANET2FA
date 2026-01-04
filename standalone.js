#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Interface gráfica minimalista com blessed (terminal)
const blessed = require('blessed');
const contrib = require('blessed-contrib');

// Criar interface no terminal
const screen = blessed.screen({
  smartCSR: true,
  title: '2FA Desktop Generator'
});

// Layout da interface
const grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

// Componentes da interface
const title = grid.set(0, 0, 1, 12, blessed.box, {
  content: '{center}2FA DESKTOP - GERADOR DE CÓDIGOS{/center}',
  tags: true,
  style: {
    fg: 'cyan',
    bg: 'blue'
  }
});

const keyInput = grid.set(2, 2, 2, 8, blessed.textbox, {
  label: ' Chave Secreta (Base32) ',
  height: 3,
  inputOnFocus: true,
  border: {type: 'line'},
  style: {
    fg: 'white',
    bg: 'black',
    focus: {
      border: {fg: 'cyan'}
    }
  }
});

const codeDisplay = grid.set(5, 2, 3, 8, blessed.box, {
  label: ' Código 2FA ',
  content: '000000',
  tags: true,
  border: {type: 'line'},
  style: {
    fg: 'green',
    bg: 'black'
  }
});

const timerDisplay = grid.set(8, 2, 1, 8, blessed.box, {
  content: 'Tempo: 30s',
  border: {type: 'line'},
  style: {
    fg: 'yellow',
    bg: 'black'
  }
});

const buttons = {
  generate: grid.set(10, 2, 2, 4, blessed.button, {
    content: '{center}GERAR{/center}',
    tags: true,
    border: {type: 'line'},
    style: {
      fg: 'white',
      bg: 'blue',
      focus: {
        bg: 'cyan'
      }
    }
  }),
  copy: grid.set(10, 6, 2, 4, blessed.button, {
    content: '{center}COPIAR{/center}',
    tags: true,
    border: {type: 'line'},
    style: {
      fg: 'white',
      bg: 'green',
      focus: {
        bg: 'lightgreen'
      }
    }
  })
};

// Foco inicial
keyInput.focus();

// Eventos
buttons.generate.on('press', () => {
  const key = keyInput.getValue();
  if (key) {
    const code = generateTOTP(key);
    codeDisplay.setContent(`{center}{bold}${code}{/bold}{/center}`);
    screen.render();
    
    // Iniciar timer
    startTimer();
  }
});

buttons.copy.on('press', () => {
  const code = codeDisplay.getContent().replace(/{[^}]*}/g, '');
  require('child_process').execSync(
    os.platform() === 'win32' ? 
      `echo ${code} | clip` : 
      `echo "${code}" | pbcopy`
  );
  codeDisplay.setContent(`{center}{bold}${code}{/bold}\n\n{cyan}Copiado!{/cyan}{/center}`);
  screen.render();
});

// Teclas de atalho
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
screen.key(['enter'], () => buttons.generate.emit('press'));
screen.key(['c'], () => buttons.copy.emit('press'));

// Renderizar interface
screen.render();

// Função TOTP (mesma lógica anterior)
function generateTOTP(secret) {
  // Implementação TOTP aqui...
  return "123456"; // Simplificado para exemplo
}

function startTimer() {
  // Implementação do timer...
}