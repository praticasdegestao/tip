// =============================================
// GESTÃO DE TIP - JAVASCRIPT
// Conexão com Supabase
// =============================================

// Configuração do Supabase
const SUPABASE_URL = 'https://ejblcvovzutugpcmujzw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nK578jMP7jzozvKAIHG0fQ_ffegZlA5';

// Inicialização do cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estado da aplicação
let currentUser = null;
let currentUserPerfis = [];
let currentTipId = null;
let editingTipId = null;

// Dados em cache
let cachedData = {
    usuarios: [],
    perfis: [],
    instituicoes: [],
    fontes: [],
    tiposResultado: [],
    portfolios: [],
    desafios: [],
    compromissos: [],
    tips: []
};

// =============================================
// INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    checkLocalStorage();
}

function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    
    // Menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', handleMenuClick);
    });
    
    // Submenu Cadastros
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', handleSubmenuClick);
    });
    
    // Modais
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-close-parecer').addEventListener('click', closeModalParecer);
    document.querySelector('.modal-close-historico').addEventListener('click', closeModalHistorico);
    document.querySelector('.modal-close-gestor').addEventListener('click', closeModalGestor);
    document.querySelector('.modal-close-adhoc').addEventListener('click', closeModalAdHoc);
    document.querySelector('.modal-close-visualizacao').addEventListener('click', closeModalVisualizacao);
    
    // Botões do Modal Gestor
    document.getElementById('btnConfirmarGestor').addEventListener('click', confirmarEnvioGestor);
    document.getElementById('btnCancelarGestor').addEventListener('click', closeModalGestor);
    
    // Botões do Modal Ad Hoc
    document.getElementById('btnConfirmarAdHoc').addEventListener('click', confirmarEnvioAdHoc);
    document.getElementById('btnCancelarAdHoc').addEventListener('click', closeModalAdHoc);
    
    // Fechar modais clicando fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

function checkLocalStorage() {
    // Limpar localStorage para sempre exigir login
    localStorage.removeItem('tipUser');
    localStorage.removeItem('tipUserPerfis');
}

// =============================================
// AUTENTICAÇÃO
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.textContent = '';
    
    try {
        console.log('Tentando login com:', username);
        
        // Buscar usuário
        const { data: usuarios, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('login', username)
            .eq('senha', password)
            .eq('ativo', true);
        
        console.log('Resposta do Supabase:', { usuarios, error });
        
        if (error) {
            console.error('Erro Supabase:', error);
            errorDiv.textContent = 'Erro ao conectar com o banco de dados: ' + error.message;
            return;
        }
        
        if (usuarios && usuarios.length > 0) {
            currentUser = usuarios[0];
            
            // Buscar perfis do usuário
            const { data: perfisUsuario, error: errorPerfis } = await supabaseClient
                .from('usuario_perfis')
                .select(`
                    perfil_id,
                    perfis (id, nome)
                `)
                .eq('usuario_id', currentUser.id);
            
            if (errorPerfis) {
                console.error('Erro ao buscar perfis:', errorPerfis);
                errorDiv.textContent = 'Erro ao buscar perfis do usuário';
                return;
            }
            
            currentUserPerfis = perfisUsuario ? perfisUsuario.map(p => p.perfis.nome) : [];
            
            // Salvar no localStorage
            localStorage.setItem('tipUser', JSON.stringify(currentUser));
            localStorage.setItem('tipUserPerfis', JSON.stringify(currentUserPerfis));
            
            showMainScreen();
        } else {
            errorDiv.textContent = 'Usuário ou senha inválidos!';
        }
    } catch (err) {
        console.error('Erro no login:', err);
        errorDiv.textContent = 'Erro ao conectar com o servidor: ' + err.message;
    }
}

function handleLogout() {
    currentUser = null;
    currentUserPerfis = [];
    localStorage.removeItem('tipUser');
    localStorage.removeItem('tipUserPerfis');
    
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').textContent = '';
}

function showMainScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
    document.getElementById('loggedUser').textContent = currentUser.nome_completo;
    
    // Controlar visibilidade do menu de Cadastros (apenas para CTI)
    const menuCadastros = document.querySelector('.menu-item.has-submenu');
    const submenuCadastros = document.getElementById('submenuCadastros');
    
    if (currentUserPerfis.includes('CTI')) {
        if (menuCadastros) menuCadastros.style.display = 'block';
        if (submenuCadastros) submenuCadastros.style.display = 'block';
    } else {
        if (menuCadastros) menuCadastros.style.display = 'none';
        if (submenuCadastros) submenuCadastros.style.display = 'none';
    }
    
    // Carregar dados iniciais
    loadInitialData();
    
    // Mostrar página inicial
    showWelcomePage();
}

async function loadInitialData() {
    try {
        // Carregar todos os dados em paralelo
        const [usuarios, perfis, instituicoes, fontes, tipos, portfolios, desafios, compromissos] = await Promise.all([
            supabaseClient.from('usuarios').select('*').eq('ativo', true).order('nome_completo'),
            supabaseClient.from('perfis').select('*').order('nome'),
            supabaseClient.from('instituicoes_parceiras').select('*').eq('ativo', true).order('nome'),
            supabaseClient.from('fontes_financiadoras').select('*').eq('ativo', true).order('nome'),
            supabaseClient.from('tipos_resultado').select('*').eq('ativo', true).order('nome'),
            supabaseClient.from('portfolios').select('*').eq('ativo', true).order('nome'),
            supabaseClient.from('desafios_inovacao').select('*, portfolios(nome)').eq('ativo', true).order('descricao'),
            supabaseClient.from('compromissos').select('*, portfolios(nome), desafios_inovacao(descricao)').eq('ativo', true).order('descricao')
        ]);
        
        cachedData.usuarios = usuarios.data || [];
        cachedData.perfis = perfis.data || [];
        cachedData.instituicoes = instituicoes.data || [];
        cachedData.fontes = fontes.data || [];
        cachedData.tiposResultado = tipos.data || [];
        cachedData.portfolios = portfolios.data || [];
        cachedData.desafios = desafios.data || [];
        cachedData.compromissos = compromissos.data || [];
        
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        showToast('Erro ao carregar dados do sistema', 'error');
    }
}

// =============================================
// NAVEGAÇÃO
// =============================================
function handleMenuClick(e) {
    const menuItem = e.currentTarget;
    const page = menuItem.dataset.page;
    
    // Toggle submenu
    if (menuItem.classList.contains('has-submenu')) {
        menuItem.classList.toggle('open');
        document.getElementById('submenuCadastros').classList.toggle('open');
        return;
    }
    
    // Remover active de todos
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    menuItem.classList.add('active');
    
    // Carregar página
    switch (page) {
        case 'fluxo':
            showFluxoProcesso();
            break;
        case 'formulario':
            showFormularioTIP();
            break;
        case 'lista':
            showListaTIPs();
            break;
    }
}

function handleSubmenuClick(e) {
    const cadastro = e.currentTarget.dataset.cadastro;
    showCadastro(cadastro);
}

function showWelcomePage() {
    document.getElementById('pageTitle').textContent = 'Bem-vindo ao Sistema TIP';
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Sistema de Gestão de Termo de Intenção de Projetos</h3>
            </div>
            <div class="card-body">
                <p style="margin-bottom: 15px; color: var(--texto-verde);">
                    Olá, <strong>${currentUser.nome_completo}</strong>!
                </p>
                <p style="margin-bottom: 15px;">
                    Você está logado com o(s) perfil(is): <strong>${currentUserPerfis.join(', ') || 'Nenhum perfil vinculado'}</strong>
                </p>
                <p style="color: var(--cinza-escuro);">
                    Utilize o menu lateral para navegar pelas opções do sistema.
                </p>
            </div>
        </div>
    `;
}

// =============================================
// FLUXO DO PROCESSO
// =============================================
function showFluxoProcesso() {
    document.getElementById('pageTitle').textContent = 'Fluxo do Processo';
    document.getElementById('pageContent').innerHTML = `
        <div class="fluxo-container fade-in">
            <img src="processotip.png" alt="Fluxo do Processo TIP" onerror="this.parentElement.innerHTML='<p style=\\'color: var(--cinza-escuro); text-align: center;\\'>Imagem do fluxo não encontrada (processotip.PNG)</p>'">
        </div>
    `;
}

// =============================================
// CADASTROS
// =============================================
function showCadastro(tipo) {
    switch (tipo) {
        case 'usuarios':
            showCadastroUsuarios();
            break;
        case 'instituicoes':
            showCadastroInstituicoes();
            break;
        case 'fontes':
            showCadastroFontes();
            break;
        case 'resultados':
            showCadastroTiposResultado();
            break;
        case 'portfolios':
            showCadastroPortfolios();
            break;
        case 'desafios':
            showCadastroDesafios();
            break;
        case 'compromissos':
            showCadastroCompromissos();
            break;
        default:
            showCadastrosMenu();
    }
}

function showCadastrosMenu() {
    document.getElementById('pageTitle').textContent = 'Cadastros';
    document.getElementById('pageContent').innerHTML = `
        <div class="cadastro-buttons fade-in">
            <button class="cadastro-btn" onclick="showCadastroUsuarios()">
                <i class="fas fa-users"></i>
                <span>Usuários</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroInstituicoes()">
                <i class="fas fa-building"></i>
                <span>Instituições Parceiras</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroFontes()">
                <i class="fas fa-money-bill"></i>
                <span>Fonte Financiadora</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroTiposResultado()">
                <i class="fas fa-trophy"></i>
                <span>Tipo de Resultado</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroPortfolios()">
                <i class="fas fa-briefcase"></i>
                <span>Portfolio</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroDesafios()">
                <i class="fas fa-lightbulb"></i>
                <span>Desafios de Inovação</span>
            </button>
            <button class="cadastro-btn" onclick="showCadastroCompromissos()">
                <i class="fas fa-handshake"></i>
                <span>Compromisso</span>
            </button>
        </div>
    `;
}

// Cadastro de Usuários
async function showCadastroUsuarios() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Usuários';
    
    const { data: usuarios, error } = await supabaseClient
        .from('usuarios')
        .select(`
            *,
            usuario_perfis (
                perfil_id,
                perfis (nome)
            )
        `)
        .order('nome_completo');
    
    if (error) {
        showToast('Erro ao carregar usuários', 'error');
        return;
    }
    
    let tableRows = '';
    if (usuarios && usuarios.length > 0) {
        usuarios.forEach(u => {
            const perfis = u.usuario_perfis ? u.usuario_perfis.map(up => up.perfis?.nome).filter(Boolean).join(', ') : '-';
            tableRows += `
                <tr>
                    <td>${u.nome_completo}</td>
                    <td>${u.login}</td>
                    <td>${perfis || '-'}</td>
                    <td>${u.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarUsuario(${u.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirUsuario(${u.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="5" style="text-align: center;">Nenhum usuário cadastrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Usuários Cadastrados</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novoUsuario()">
                    <i class="fas fa-plus"></i> Novo Usuário
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Nome Completo</th>
                            <th>Login</th>
                            <th>Perfis</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novoUsuario() {
    let perfisCheckboxes = '';
    cachedData.perfis.forEach(p => {
        perfisCheckboxes += `
            <div class="perfil-checkbox">
                <input type="checkbox" id="perfil_${p.id}" name="perfis" value="${p.id}">
                <label for="perfil_${p.id}">${p.nome}</label>
            </div>
        `;
    });
    
    document.getElementById('modalTitle').textContent = 'Novo Usuário';
    document.getElementById('modalBody').innerHTML = `
        <form id="formUsuario">
            <input type="hidden" id="usuarioId" value="">
            <div class="form-group">
                <label>Nome Completo *</label>
                <input type="text" id="nomeCompleto" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Login *</label>
                <input type="text" id="loginUsuario" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Senha *</label>
                <input type="password" id="senhaUsuario" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Perfis *</label>
                <div class="perfis-container">
                    ${perfisCheckboxes}
                </div>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formUsuario').addEventListener('submit', salvarUsuario);
    openModal();
}

async function editarUsuario(id) {
    const { data: usuario, error } = await supabaseClient
        .from('usuarios')
        .select(`
            *,
            usuario_perfis (perfil_id)
        `)
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar usuário', 'error');
        return;
    }
    
    const perfisUsuario = usuario.usuario_perfis ? usuario.usuario_perfis.map(up => up.perfil_id) : [];
    
    let perfisCheckboxes = '';
    cachedData.perfis.forEach(p => {
        const checked = perfisUsuario.includes(p.id) ? 'checked' : '';
        perfisCheckboxes += `
            <div class="perfil-checkbox">
                <input type="checkbox" id="perfil_${p.id}" name="perfis" value="${p.id}" ${checked}>
                <label for="perfil_${p.id}">${p.nome}</label>
            </div>
        `;
    });
    
    document.getElementById('modalTitle').textContent = 'Editar Usuário';
    document.getElementById('modalBody').innerHTML = `
        <form id="formUsuario">
            <input type="hidden" id="usuarioId" value="${usuario.id}">
            <div class="form-group">
                <label>Nome Completo *</label>
                <input type="text" id="nomeCompleto" class="form-control" value="${usuario.nome_completo}" required>
            </div>
            <div class="form-group">
                <label>Login *</label>
                <input type="text" id="loginUsuario" class="form-control" value="${usuario.login}" required>
            </div>
            <div class="form-group">
                <label>Senha *</label>
                <input type="password" id="senhaUsuario" class="form-control" value="${usuario.senha}" required>
            </div>
            <div class="form-group">
                <label>Perfis *</label>
                <div class="perfis-container">
                    ${perfisCheckboxes}
                </div>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formUsuario').addEventListener('submit', salvarUsuario);
    openModal();
}

async function salvarUsuario(e) {
    e.preventDefault();
    
    const id = document.getElementById('usuarioId').value;
    const nomeCompleto = document.getElementById('nomeCompleto').value;
    const login = document.getElementById('loginUsuario').value;
    const senha = document.getElementById('senhaUsuario').value;
    
    const perfisChecked = [];
    document.querySelectorAll('input[name="perfis"]:checked').forEach(cb => {
        perfisChecked.push(parseInt(cb.value));
    });
    
    if (perfisChecked.length === 0) {
        showToast('Selecione pelo menos um perfil', 'warning');
        return;
    }
    
    try {
        let usuarioId = id;
        
        if (id) {
            const { error } = await supabaseClient
                .from('usuarios')
                .update({ nome_completo: nomeCompleto, login, senha })
                .eq('id', id);
            
            if (error) throw error;
            
            await supabaseClient.from('usuario_perfis').delete().eq('usuario_id', id);
        } else {
            const { data, error } = await supabaseClient
                .from('usuarios')
                .insert({ nome_completo: nomeCompleto, login, senha })
                .select()
                .single();
            
            if (error) throw error;
            usuarioId = data.id;
        }
        
        const perfilInserts = perfisChecked.map(perfilId => ({
            usuario_id: parseInt(usuarioId),
            perfil_id: perfilId
        }));
        
        await supabaseClient.from('usuario_perfis').insert(perfilInserts);
        
        showToast('Usuário salvo com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroUsuarios();
        
    } catch (err) {
        console.error('Erro ao salvar usuário:', err);
        showToast('Erro ao salvar usuário', 'error');
    }
}

async function excluirUsuario(id) {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    
    try {
        await supabaseClient.from('usuario_perfis').delete().eq('usuario_id', id);
        await supabaseClient.from('usuarios').delete().eq('id', id);
        
        showToast('Usuário excluído com sucesso!', 'success');
        await loadInitialData();
        showCadastroUsuarios();
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        showToast('Erro ao excluir usuário', 'error');
    }
}

// Cadastro de Instituições Parceiras
async function showCadastroInstituicoes() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Instituições Parceiras';
    
    const { data: instituicoes, error } = await supabaseClient
        .from('instituicoes_parceiras')
        .select('*')
        .order('nome');
    
    if (error) {
        showToast('Erro ao carregar instituições', 'error');
        return;
    }
    
    let tableRows = '';
    if (instituicoes && instituicoes.length > 0) {
        instituicoes.forEach(i => {
            tableRows += `
                <tr>
                    <td>${i.nome}</td>
                    <td>${i.sigla || '-'}</td>
                    <td>${i.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarInstituicao(${i.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirInstituicao(${i.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="4" style="text-align: center;">Nenhuma instituição cadastrada.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Instituições Parceiras Cadastradas</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novaInstituicao()">
                    <i class="fas fa-plus"></i> Nova Instituição
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Sigla</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novaInstituicao() {
    document.getElementById('modalTitle').textContent = 'Nova Instituição Parceira';
    document.getElementById('modalBody').innerHTML = `
        <form id="formInstituicao">
            <input type="hidden" id="instituicaoId" value="">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeInstituicao" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Sigla</label>
                <input type="text" id="siglaInstituicao" class="form-control">
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formInstituicao').addEventListener('submit', salvarInstituicao);
    openModal();
}

async function editarInstituicao(id) {
    const { data: inst, error } = await supabaseClient
        .from('instituicoes_parceiras')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar instituição', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Editar Instituição Parceira';
    document.getElementById('modalBody').innerHTML = `
        <form id="formInstituicao">
            <input type="hidden" id="instituicaoId" value="${inst.id}">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeInstituicao" class="form-control" value="${inst.nome}" required>
            </div>
            <div class="form-group">
                <label>Sigla</label>
                <input type="text" id="siglaInstituicao" class="form-control" value="${inst.sigla || ''}">
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formInstituicao').addEventListener('submit', salvarInstituicao);
    openModal();
}

async function salvarInstituicao(e) {
    e.preventDefault();
    
    const id = document.getElementById('instituicaoId').value;
    const nome = document.getElementById('nomeInstituicao').value;
    const sigla = document.getElementById('siglaInstituicao').value;
    
    try {
        if (id) {
            await supabaseClient
                .from('instituicoes_parceiras')
                .update({ nome, sigla })
                .eq('id', id);
        } else {
            await supabaseClient
                .from('instituicoes_parceiras')
                .insert({ nome, sigla });
        }
        
        showToast('Instituição salva com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroInstituicoes();
    } catch (err) {
        console.error('Erro ao salvar instituição:', err);
        showToast('Erro ao salvar instituição', 'error');
    }
}

async function excluirInstituicao(id) {
    if (!confirm('Deseja realmente excluir esta instituição?')) return;
    
    try {
        await supabaseClient.from('instituicoes_parceiras').delete().eq('id', id);
        showToast('Instituição excluída com sucesso!', 'success');
        await loadInitialData();
        showCadastroInstituicoes();
    } catch (err) {
        showToast('Erro ao excluir instituição', 'error');
    }
}

// Cadastro de Fontes Financiadoras
async function showCadastroFontes() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Fontes Financiadoras';
    
    const { data: fontes, error } = await supabaseClient
        .from('fontes_financiadoras')
        .select('*')
        .order('nome');
    
    if (error) {
        showToast('Erro ao carregar fontes', 'error');
        return;
    }
    
    let tableRows = '';
    if (fontes && fontes.length > 0) {
        fontes.forEach(f => {
            tableRows += `
                <tr>
                    <td>${f.nome}</td>
                    <td>${f.sigla || '-'}</td>
                    <td>${f.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarFonte(${f.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirFonte(${f.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="4" style="text-align: center;">Nenhuma fonte cadastrada.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Fontes Financiadoras Cadastradas</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novaFonte()">
                    <i class="fas fa-plus"></i> Nova Fonte
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Sigla</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novaFonte() {
    document.getElementById('modalTitle').textContent = 'Nova Fonte Financiadora';
    document.getElementById('modalBody').innerHTML = `
        <form id="formFonte">
            <input type="hidden" id="fonteId" value="">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeFonte" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Sigla</label>
                <input type="text" id="siglaFonte" class="form-control">
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formFonte').addEventListener('submit', salvarFonte);
    openModal();
}

async function editarFonte(id) {
    const { data: fonte, error } = await supabaseClient
        .from('fontes_financiadoras')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar fonte', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Editar Fonte Financiadora';
    document.getElementById('modalBody').innerHTML = `
        <form id="formFonte">
            <input type="hidden" id="fonteId" value="${fonte.id}">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeFonte" class="form-control" value="${fonte.nome}" required>
            </div>
            <div class="form-group">
                <label>Sigla</label>
                <input type="text" id="siglaFonte" class="form-control" value="${fonte.sigla || ''}">
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formFonte').addEventListener('submit', salvarFonte);
    openModal();
}

async function salvarFonte(e) {
    e.preventDefault();
    
    const id = document.getElementById('fonteId').value;
    const nome = document.getElementById('nomeFonte').value;
    const sigla = document.getElementById('siglaFonte').value;
    
    try {
        if (id) {
            await supabaseClient.from('fontes_financiadoras').update({ nome, sigla }).eq('id', id);
        } else {
            await supabaseClient.from('fontes_financiadoras').insert({ nome, sigla });
        }
        
        showToast('Fonte salva com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroFontes();
    } catch (err) {
        showToast('Erro ao salvar fonte', 'error');
    }
}

async function excluirFonte(id) {
    if (!confirm('Deseja realmente excluir esta fonte?')) return;
    
    try {
        await supabaseClient.from('fontes_financiadoras').delete().eq('id', id);
        showToast('Fonte excluída com sucesso!', 'success');
        await loadInitialData();
        showCadastroFontes();
    } catch (err) {
        showToast('Erro ao excluir fonte', 'error');
    }
}

// Cadastro de Tipos de Resultado
async function showCadastroTiposResultado() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Tipos de Resultado';
    
    const { data: tipos, error } = await supabaseClient
        .from('tipos_resultado')
        .select('*')
        .order('nome');
    
    if (error) {
        showToast('Erro ao carregar tipos', 'error');
        return;
    }
    
    let tableRows = '';
    if (tipos && tipos.length > 0) {
        tipos.forEach(t => {
            tableRows += `
                <tr>
                    <td>${t.nome}</td>
                    <td>${t.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarTipoResultado(${t.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirTipoResultado(${t.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="3" style="text-align: center;">Nenhum tipo cadastrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Tipos de Resultado Cadastrados</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novoTipoResultado()">
                    <i class="fas fa-plus"></i> Novo Tipo
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novoTipoResultado() {
    document.getElementById('modalTitle').textContent = 'Novo Tipo de Resultado';
    document.getElementById('modalBody').innerHTML = `
        <form id="formTipoResultado">
            <input type="hidden" id="tipoResultadoId" value="">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeTipoResultado" class="form-control" required>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formTipoResultado').addEventListener('submit', salvarTipoResultado);
    openModal();
}

async function editarTipoResultado(id) {
    const { data: tipo, error } = await supabaseClient
        .from('tipos_resultado')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar tipo', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Editar Tipo de Resultado';
    document.getElementById('modalBody').innerHTML = `
        <form id="formTipoResultado">
            <input type="hidden" id="tipoResultadoId" value="${tipo.id}">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomeTipoResultado" class="form-control" value="${tipo.nome}" required>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formTipoResultado').addEventListener('submit', salvarTipoResultado);
    openModal();
}

async function salvarTipoResultado(e) {
    e.preventDefault();
    
    const id = document.getElementById('tipoResultadoId').value;
    const nome = document.getElementById('nomeTipoResultado').value;
    
    try {
        if (id) {
            await supabaseClient.from('tipos_resultado').update({ nome }).eq('id', id);
        } else {
            await supabaseClient.from('tipos_resultado').insert({ nome });
        }
        
        showToast('Tipo de resultado salvo com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroTiposResultado();
    } catch (err) {
        showToast('Erro ao salvar tipo', 'error');
    }
}

async function excluirTipoResultado(id) {
    if (!confirm('Deseja realmente excluir este tipo?')) return;
    
    try {
        await supabaseClient.from('tipos_resultado').delete().eq('id', id);
        showToast('Tipo excluído com sucesso!', 'success');
        await loadInitialData();
        showCadastroTiposResultado();
    } catch (err) {
        showToast('Erro ao excluir tipo', 'error');
    }
}

// Cadastro de Portfolios
async function showCadastroPortfolios() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Portfolios';
    
    const { data: portfolios, error } = await supabaseClient
        .from('portfolios')
        .select('*')
        .order('nome');
    
    if (error) {
        showToast('Erro ao carregar portfolios', 'error');
        return;
    }
    
    let tableRows = '';
    if (portfolios && portfolios.length > 0) {
        portfolios.forEach(p => {
            tableRows += `
                <tr>
                    <td>${p.nome}</td>
                    <td>${p.descricao || '-'}</td>
                    <td>${p.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarPortfolio(${p.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirPortfolio(${p.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="4" style="text-align: center;">Nenhum portfolio cadastrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Portfolios Cadastrados</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novoPortfolio()">
                    <i class="fas fa-plus"></i> Novo Portfolio
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novoPortfolio() {
    document.getElementById('modalTitle').textContent = 'Novo Portfolio';
    document.getElementById('modalBody').innerHTML = `
        <form id="formPortfolio">
            <input type="hidden" id="portfolioId" value="">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomePortfolio" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="descricaoPortfolio" class="form-control" rows="3"></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formPortfolio').addEventListener('submit', salvarPortfolio);
    openModal();
}

async function editarPortfolio(id) {
    const { data: portfolio, error } = await supabaseClient
        .from('portfolios')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar portfolio', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Editar Portfolio';
    document.getElementById('modalBody').innerHTML = `
        <form id="formPortfolio">
            <input type="hidden" id="portfolioId" value="${portfolio.id}">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="nomePortfolio" class="form-control" value="${portfolio.nome}" required>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="descricaoPortfolio" class="form-control" rows="3">${portfolio.descricao || ''}</textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formPortfolio').addEventListener('submit', salvarPortfolio);
    openModal();
}

async function salvarPortfolio(e) {
    e.preventDefault();
    
    const id = document.getElementById('portfolioId').value;
    const nome = document.getElementById('nomePortfolio').value;
    const descricao = document.getElementById('descricaoPortfolio').value;
    
    try {
        if (id) {
            await supabaseClient.from('portfolios').update({ nome, descricao }).eq('id', id);
        } else {
            await supabaseClient.from('portfolios').insert({ nome, descricao });
        }
        
        showToast('Portfolio salvo com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroPortfolios();
    } catch (err) {
        showToast('Erro ao salvar portfolio', 'error');
    }
}

async function excluirPortfolio(id) {
    if (!confirm('Deseja realmente excluir este portfolio?')) return;
    
    try {
        await supabaseClient.from('portfolios').delete().eq('id', id);
        showToast('Portfolio excluído com sucesso!', 'success');
        await loadInitialData();
        showCadastroPortfolios();
    } catch (err) {
        showToast('Erro ao excluir portfolio', 'error');
    }
}

// Cadastro de Desafios de Inovação
async function showCadastroDesafios() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Desafios de Inovação';
    
    const { data: desafios, error } = await supabaseClient
        .from('desafios_inovacao')
        .select('*, portfolios(nome)')
        .order('descricao');
    
    if (error) {
        showToast('Erro ao carregar desafios', 'error');
        return;
    }
    
    let tableRows = '';
    if (desafios && desafios.length > 0) {
        desafios.forEach(d => {
            tableRows += `
                <tr>
                    <td>${d.portfolios?.nome || '-'}</td>
                    <td>${d.descricao}</td>
                    <td>${d.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarDesafio(${d.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirDesafio(${d.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="4" style="text-align: center;">Nenhum desafio cadastrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Desafios de Inovação Cadastrados</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novoDesafio()">
                    <i class="fas fa-plus"></i> Novo Desafio
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Portfolio</th>
                            <th>Descrição do Desafio</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novoDesafio() {
    let portfolioOptions = '<option value="">Selecione...</option>';
    cachedData.portfolios.forEach(p => {
        portfolioOptions += `<option value="${p.id}">${p.nome}</option>`;
    });
    
    document.getElementById('modalTitle').textContent = 'Novo Desafio de Inovação';
    document.getElementById('modalBody').innerHTML = `
        <form id="formDesafio">
            <input type="hidden" id="desafioId" value="">
            <div class="form-group">
                <label>Portfolio *</label>
                <select id="portfolioDesafio" class="form-control" required>
                    ${portfolioOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Descrição do Desafio *</label>
                <textarea id="descricaoDesafio" class="form-control" rows="3" required></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formDesafio').addEventListener('submit', salvarDesafio);
    openModal();
}

async function editarDesafio(id) {
    const { data: desafio, error } = await supabaseClient
        .from('desafios_inovacao')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar desafio', 'error');
        return;
    }
    
    let portfolioOptions = '<option value="">Selecione...</option>';
    cachedData.portfolios.forEach(p => {
        const selected = p.id === desafio.portfolio_id ? 'selected' : '';
        portfolioOptions += `<option value="${p.id}" ${selected}>${p.nome}</option>`;
    });
    
    document.getElementById('modalTitle').textContent = 'Editar Desafio de Inovação';
    document.getElementById('modalBody').innerHTML = `
        <form id="formDesafio">
            <input type="hidden" id="desafioId" value="${desafio.id}">
            <div class="form-group">
                <label>Portfolio *</label>
                <select id="portfolioDesafio" class="form-control" required>
                    ${portfolioOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Descrição do Desafio *</label>
                <textarea id="descricaoDesafio" class="form-control" rows="3" required>${desafio.descricao}</textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formDesafio').addEventListener('submit', salvarDesafio);
    openModal();
}

async function salvarDesafio(e) {
    e.preventDefault();
    
    const id = document.getElementById('desafioId').value;
    const portfolio_id = document.getElementById('portfolioDesafio').value;
    const descricao = document.getElementById('descricaoDesafio').value;
    
    try {
        if (id) {
            await supabaseClient.from('desafios_inovacao').update({ portfolio_id, descricao }).eq('id', id);
        } else {
            await supabaseClient.from('desafios_inovacao').insert({ portfolio_id, descricao });
        }
        
        showToast('Desafio salvo com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroDesafios();
    } catch (err) {
        showToast('Erro ao salvar desafio', 'error');
    }
}

async function excluirDesafio(id) {
    if (!confirm('Deseja realmente excluir este desafio?')) return;
    
    try {
        await supabaseClient.from('desafios_inovacao').delete().eq('id', id);
        showToast('Desafio excluído com sucesso!', 'success');
        await loadInitialData();
        showCadastroDesafios();
    } catch (err) {
        showToast('Erro ao excluir desafio', 'error');
    }
}

// Cadastro de Compromissos
async function showCadastroCompromissos() {
    document.getElementById('pageTitle').textContent = 'Cadastro de Compromissos';
    
    const { data: compromissos, error } = await supabaseClient
        .from('compromissos')
        .select('*, portfolios(nome), desafios_inovacao(descricao)')
        .order('descricao');
    
    if (error) {
        showToast('Erro ao carregar compromissos', 'error');
        return;
    }
    
    let tableRows = '';
    if (compromissos && compromissos.length > 0) {
        compromissos.forEach(c => {
            const desafioDesc = c.desafios_inovacao?.descricao || '-';
            tableRows += `
                <tr>
                    <td>${c.portfolios?.nome || '-'}</td>
                    <td>${desafioDesc.length > 50 ? desafioDesc.substring(0, 50) + '...' : desafioDesc}</td>
                    <td>${c.descricao}</td>
                    <td>${c.ativo ? 'Sim' : 'Não'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit" onclick="editarCompromisso(${c.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="excluirCompromisso(${c.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="5" style="text-align: center;">Nenhum compromisso cadastrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header">
                <h3>Compromissos Cadastrados</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-success mb-20" onclick="novoCompromisso()">
                    <i class="fas fa-plus"></i> Novo Compromisso
                </button>
                <table class="tips-table">
                    <thead>
                        <tr>
                            <th>Portfolio</th>
                            <th>Desafio de Inovação</th>
                            <th>Descrição do Compromisso</th>
                            <th>Ativo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function novoCompromisso() {
    let portfolioOptions = '<option value="">Selecione...</option>';
    cachedData.portfolios.forEach(p => {
        portfolioOptions += `<option value="${p.id}">${p.nome}</option>`;
    });
    
    document.getElementById('modalTitle').textContent = 'Novo Compromisso';
    document.getElementById('modalBody').innerHTML = `
        <form id="formCompromisso">
            <input type="hidden" id="compromissoId" value="">
            <div class="form-group">
                <label>Portfolio *</label>
                <select id="portfolioCompromisso" class="form-control" required onchange="carregarDesafiosCompromisso()">
                    ${portfolioOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Desafio de Inovação *</label>
                <select id="desafioCompromisso" class="form-control" required>
                    <option value="">Selecione primeiro o Portfolio...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Descrição do Compromisso *</label>
                <textarea id="descricaoCompromisso" class="form-control" rows="3" required></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formCompromisso').addEventListener('submit', salvarCompromisso);
    openModal();
}

function carregarDesafiosCompromisso(selectedDesafioId = null) {
    const portfolioId = document.getElementById('portfolioCompromisso').value;
    const selectDesafio = document.getElementById('desafioCompromisso');
    
    let options = '<option value="">Selecione...</option>';
    cachedData.desafios.filter(d => d.portfolio_id == portfolioId).forEach(d => {
        const selected = d.id == selectedDesafioId ? 'selected' : '';
        options += `<option value="${d.id}" ${selected}>${d.descricao}</option>`;
    });
    
    selectDesafio.innerHTML = options;
}

async function editarCompromisso(id) {
    const { data: compromisso, error } = await supabaseClient
        .from('compromissos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        showToast('Erro ao carregar compromisso', 'error');
        return;
    }
    
    let portfolioOptions = '<option value="">Selecione...</option>';
    cachedData.portfolios.forEach(p => {
        const selected = p.id === compromisso.portfolio_id ? 'selected' : '';
        portfolioOptions += `<option value="${p.id}" ${selected}>${p.nome}</option>`;
    });
    
    document.getElementById('modalTitle').textContent = 'Editar Compromisso';
    document.getElementById('modalBody').innerHTML = `
        <form id="formCompromisso">
            <input type="hidden" id="compromissoId" value="${compromisso.id}">
            <div class="form-group">
                <label>Portfolio *</label>
                <select id="portfolioCompromisso" class="form-control" required onchange="carregarDesafiosCompromisso()">
                    ${portfolioOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Desafio de Inovação *</label>
                <select id="desafioCompromisso" class="form-control" required>
                    <option value="">Carregando...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Descrição do Compromisso *</label>
                <textarea id="descricaoCompromisso" class="form-control" rows="3" required>${compromisso.descricao}</textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formCompromisso').addEventListener('submit', salvarCompromisso);
    openModal();
    
    setTimeout(() => {
        carregarDesafiosCompromisso(compromisso.desafio_inovacao_id);
    }, 100);
}

async function salvarCompromisso(e) {
    e.preventDefault();
    
    const id = document.getElementById('compromissoId').value;
    const portfolio_id = document.getElementById('portfolioCompromisso').value;
    const desafio_inovacao_id = document.getElementById('desafioCompromisso').value;
    const descricao = document.getElementById('descricaoCompromisso').value;
    
    try {
        if (id) {
            await supabaseClient.from('compromissos').update({ portfolio_id, desafio_inovacao_id, descricao }).eq('id', id);
        } else {
            await supabaseClient.from('compromissos').insert({ portfolio_id, desafio_inovacao_id, descricao });
        }
        
        showToast('Compromisso salvo com sucesso!', 'success');
        closeModal();
        await loadInitialData();
        showCadastroCompromissos();
    } catch (err) {
        showToast('Erro ao salvar compromisso', 'error');
    }
}

async function excluirCompromisso(id) {
    if (!confirm('Deseja realmente excluir este compromisso?')) return;
    
    try {
        await supabaseClient.from('compromissos').delete().eq('id', id);
        showToast('Compromisso excluído com sucesso!', 'success');
        await loadInitialData();
        showCadastroCompromissos();
    } catch (err) {
        showToast('Erro ao excluir compromisso', 'error');
    }
}

// =============================================
// FORMULÁRIO DO TIP
// =============================================
async function showFormularioTIP(tipId = null) {
    editingTipId = tipId;
    document.getElementById('pageTitle').textContent = tipId ? 'Editar TIP' : 'Novo Formulário do TIP';
    
    let solicitanteOptions = '<option value="">Selecione...</option>';
    cachedData.usuarios.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)).forEach(u => {
        solicitanteOptions += `<option value="${u.id}">${u.nome_completo}</option>`;
    });
    
    let tipData = null;
    let alinhamentos = [];
    let resultados = [];
    let colaboradores = [];
    let instituicoesTip = [];
    let orcamentos = [];
    let riscos = [];
    let parecerGestor = '';
    let parecerAdHoc = [];
    
    if (tipId) {
        const { data: tip, error } = await supabaseClient
            .from('tips')
            .select('*')
            .eq('id', tipId)
            .single();
        
        if (!error && tip) {
            tipData = tip;
            
            const [alinRes, resRes, colRes, instRes, orcRes, riscRes, adhocRes] = await Promise.all([
                supabaseClient.from('tip_alinhamentos').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_resultados').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_colaboradores').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_instituicoes').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_orcamentos').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_riscos').select('*').eq('tip_id', tipId),
                supabaseClient.from('tip_adhoc').select('*, usuarios:adhoc_id(nome_completo)').eq('tip_id', tipId)
            ]);
            
            alinhamentos = alinRes.data || [];
            resultados = resRes.data || [];
            colaboradores = colRes.data || [];
            instituicoesTip = instRes.data || [];
            orcamentos = orcRes.data || [];
            riscos = riscRes.data || [];
            parecerAdHoc = adhocRes.data || [];
            parecerGestor = tip.parecer_gestor || '';
        }
    }
    
    const isCTI = currentUserPerfis.includes('CTI');
    const isGestor = currentUserPerfis.includes('Gestor');
    const isSolicitante = !tipData || tipData.solicitante_id === currentUser.id;
    const isAdHoc = currentUserPerfis.includes('Ad Hoc');
    
    const canEdit = !tipData || 
                    tipData.status === 'Rascunho' || 
                    (tipData.status === 'Enviado Gestor' && (isSolicitante || isGestor)) ||
                    isCTI;
    
    const disabledAttr = canEdit ? '' : 'disabled';
    
    let formHTML = `
        <form id="formTIP" class="tip-form">
            <input type="hidden" id="tipId" value="${tipId || ''}">
            <input type="hidden" id="tipStatus" value="${tipData?.status || 'Rascunho'}">
            
            <div class="form-section">
                <h3 class="form-section-title">Informações Básicas</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>Solicitante *</label>
                        <select id="solicitante" class="form-control" required ${disabledAttr}>
                            ${solicitanteOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Prazo Previsto de Execução (meses) *</label>
                        <input type="number" id="prazoExecucao" class="form-control" min="1" required ${disabledAttr} value="${tipData?.prazo_execucao || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Título da Proposta * <span class="form-hint">(máximo de 250 caracteres)</span></label>
                    <input type="text" id="tituloProposta" class="form-control" maxlength="250" required ${disabledAttr} value="${tipData?.titulo || ''}">
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Alinhamento Estratégico</h3>
                <p class="form-hint" style="margin-bottom: 10px;">(Relacione os desafios de inovação de Portfólios da Embrapa e compromissos da agenda da Unidade que serão atendidos com esta proposta)</p>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Alinhamentos</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addAlinhamentoRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Portfolio</th>
                                <th>Desafio de Inovação</th>
                                <th>Compromisso</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridAlinhamentos"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Objetivo e Justificativa</h3>
                <div class="form-group">
                    <label>Objetivo * <span class="form-hint">(Máximo de 500 caracteres)</span></label>
                    <textarea id="objetivo" class="form-control" rows="5" maxlength="500" required ${disabledAttr}>${tipData?.objetivo || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Caracterização do Problema/Oportunidade e Justificativa * <span class="form-hint">(Descrever o problema/oportunidade e apresentar os benefícios e impactos esperados) (Máximo de 2000 caracteres)</span></label>
                    <textarea id="problemaOportunidade" class="form-control" rows="5" maxlength="2000" required ${disabledAttr}>${tipData?.problema_oportunidade_justificativa || ''}</textarea>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Principais Resultados a serem entregues pelo Projeto</h3>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Resultados</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addResultadoRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Tipo Resultado</th>
                                <th>TRL</th>
                                <th>Descrição</th>
                                <th>Como o resultado ajuda?</th>
                                <th>Mês Previsão</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridResultados"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Colaboradores Potenciais</h3>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Colaboradores</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addColaboradorRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Nome do Colaborador</th>
                                <th>Responsabilidade Prevista</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridColaboradores"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Instituições Parceiras Previstas</h3>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Instituições</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addInstituicaoRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Instituição Parceira</th>
                                <th>Responsabilidade no Projeto</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridInstituicoes"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Orçamento e Fontes de Recursos</h3>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Recursos</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addOrcamentoRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Fonte Financiadora</th>
                                <th>Valor Estimado (R$)</th>
                                <th>%</th>
                                <th>Já tem Edital?</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridOrcamentos"></tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-section">
                <h3 class="form-section-title">Riscos</h3>
                <p class="form-hint" style="margin-bottom: 10px;">(Relacione os principais riscos previstos, probabilidade, impacto e formas de resposta)</p>
                <div class="grid-container">
                    <div class="grid-header">
                        <h4>Riscos do Projeto</h4>
                        ${canEdit ? '<button type="button" class="btn-icon add" onclick="addRiscoRow()"><i class="fas fa-plus"></i></button>' : ''}
                    </div>
                    <table class="grid-table">
                        <thead>
                            <tr>
                                <th>Descrição do Risco</th>
                                <th>Probabilidade</th>
                                <th>Impacto</th>
                                <th>Resposta</th>
                                <th>Descrição da Resposta</th>
                                ${canEdit ? '<th width="50">Ação</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="gridRiscos"></tbody>
                    </table>
                </div>
            </div>
    `;
    
    if (parecerGestor || isGestor || isCTI) {
        formHTML += `
            <div class="form-section">
                <h3 class="form-section-title" style="color: var(--texto-laranja);">Parecer do Gestor</h3>
                <div class="parecer-section">
                    ${parecerGestor ? `
                        <div class="parecer-content">${parecerGestor}</div>
                        <div class="parecer-meta">
                            ${tipData?.data_parecer_gestor ? 'Registrado em: ' + formatDateTime(tipData.data_parecer_gestor) : ''}
                            ${tipData?.anuencia_gestor ? ' | <strong style="color: var(--verde-escuro);">Anuência Concedida</strong>' : ''}
                        </div>
                    ` : '<p style="color: var(--cinza-escuro);">Nenhum parecer registrado.</p>'}
                </div>
            </div>
        `;
    }
    
    if (isCTI && parecerAdHoc.length > 0) {
        formHTML += `<div class="form-section"><h3 class="form-section-title" style="color: #8E44AD;">Parecer do Ad Hoc</h3>`;
        parecerAdHoc.forEach(p => {
            formHTML += `
                <div class="parecer-section" style="border-left-color: #8E44AD; margin-bottom: 15px;">
                    <div class="parecer-title">${p.usuarios?.nome_completo || 'Ad Hoc'}</div>
                    <div class="parecer-content">${p.parecer || 'Aguardando parecer...'}</div>
                    <div class="parecer-meta">
                        ${p.resultado ? `Resultado: <strong>${p.resultado}</strong>` : 'Pendente'}
                        ${p.data_parecer ? ' | ' + formatDateTime(p.data_parecer) : ''}
                    </div>
                </div>
            `;
        });
        formHTML += `</div>`;
    }
    
    formHTML += `<div class="form-actions">`;
    
    if (canEdit && (!tipData || tipData.status === 'Rascunho' || tipData.status === 'Enviado Gestor')) {
        formHTML += `<button type="button" class="btn btn-primary" onclick="salvarTIPRascunho()"><i class="fas fa-save"></i> Salvar Rascunho</button>`;
        
        if (!tipData || tipData.status === 'Rascunho') {
            formHTML += `<button type="button" class="btn btn-warning" onclick="enviarParaGestor()"><i class="fas fa-paper-plane"></i> Enviar para Gestor</button>`;
        }
        
        if (tipData && tipData.anuencia_gestor) {
            formHTML += `<button type="button" class="btn btn-success" onclick="enviarParaCTI()"><i class="fas fa-check-circle"></i> Enviar para CTI</button>`;
        }
    }
    
    if (isGestor && tipData && tipData.status === 'Enviado Gestor' && tipData.gestor_id === currentUser.id) {
        formHTML += `<button type="button" class="btn btn-primary" onclick="abrirModalParecerGestor()"><i class="fas fa-clipboard-check"></i> Registrar Parecer</button>`;
    }
    
    if (isCTI && tipData && tipData.status === 'Enviado CTI') {
        formHTML += `
            <button type="button" class="btn btn-warning" onclick="abrirModalEnviarAdHoc()"><i class="fas fa-user-tag"></i> Enviar para Ad Hoc</button>
            <button type="button" class="btn btn-success" onclick="aprovarTIP()"><i class="fas fa-check"></i> Aprovar</button>
            <button type="button" class="btn btn-danger" onclick="reprovarTIP()"><i class="fas fa-times"></i> Reprovar</button>
        `;
    }
    
    if (isAdHoc && tipData) {
        const adhocPendente = parecerAdHoc.find(p => p.adhoc_id === currentUser.id && !p.parecer);
        if (adhocPendente) {
            formHTML += `<button type="button" class="btn btn-primary" onclick="abrirModalParecerAdHoc()"><i class="fas fa-clipboard-check"></i> Registrar Parecer Ad Hoc</button>`;
        }
    }
    
    formHTML += `<button type="button" class="btn btn-secondary" onclick="showListaTIPs()"><i class="fas fa-arrow-left"></i> Voltar</button></div></form>`;
    
    document.getElementById('pageContent').innerHTML = `<div class="fade-in">${formHTML}</div>`;
    
    if (tipData) {
        document.getElementById('solicitante').value = tipData.solicitante_id || '';
        alinhamentos.forEach(a => addAlinhamentoRow(a));
        resultados.forEach(r => addResultadoRow(r));
        colaboradores.forEach(c => addColaboradorRow(c));
        instituicoesTip.forEach(i => addInstituicaoRow(i));
        orcamentos.forEach(o => addOrcamentoRow(o));
        riscos.forEach(r => addRiscoRow(r));
    } else {
        document.getElementById('solicitante').value = currentUser.id;
    }
}

// Funções para grids
function addAlinhamentoRow(data = null) {
    const tbody = document.getElementById('gridAlinhamentos');
    const rowIndex = tbody.children.length;
    
    let portfolioOptions = '<option value="">Selecione...</option>';
    cachedData.portfolios.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(p => {
        const selected = data && data.portfolio_id == p.id ? 'selected' : '';
        portfolioOptions += `<option value="${p.id}" ${selected}>${p.nome}</option>`;
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><select class="alin-portfolio" onchange="updateDesafiosAlinhamento(this, ${rowIndex})">${portfolioOptions}</select></td>
        <td><select class="alin-desafio" id="alinDesafio_${rowIndex}" onchange="updateCompromissosAlinhamento(this, ${rowIndex})"><option value="">Selecione o Portfolio primeiro...</option></select></td>
        <td><select class="alin-compromisso" id="alinCompromisso_${rowIndex}"><option value="">Selecione o Desafio primeiro...</option></select></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
    
    if (data) {
        setTimeout(() => {
            updateDesafiosAlinhamento(row.querySelector('.alin-portfolio'), rowIndex, data.desafio_inovacao_id);
            setTimeout(() => {
                updateCompromissosAlinhamento(row.querySelector('.alin-desafio'), rowIndex, data.compromisso_id);
            }, 100);
        }, 100);
    }
}

function updateDesafiosAlinhamento(selectPortfolio, rowIndex, selectedDesafioId = null) {
    const portfolioId = selectPortfolio.value;
    const selectDesafio = document.getElementById(`alinDesafio_${rowIndex}`);
    
    let options = '<option value="">Selecione...</option>';
    cachedData.desafios.filter(d => d.portfolio_id == portfolioId).forEach(d => {
        const selected = d.id == selectedDesafioId ? 'selected' : '';
        const desc = d.descricao.length > 80 ? d.descricao.substring(0, 80) + '...' : d.descricao;
        options += `<option value="${d.id}" ${selected}>${desc}</option>`;
    });
    
    selectDesafio.innerHTML = options;
    document.getElementById(`alinCompromisso_${rowIndex}`).innerHTML = '<option value="">Selecione o Desafio primeiro...</option>';
}

function updateCompromissosAlinhamento(selectDesafio, rowIndex, selectedCompromissoId = null) {
    const desafioId = selectDesafio.value;
    const selectCompromisso = document.getElementById(`alinCompromisso_${rowIndex}`);
    
    let options = '<option value="">Selecione...</option>';
    cachedData.compromissos.filter(c => c.desafio_inovacao_id == desafioId).forEach(c => {
        const selected = c.id == selectedCompromissoId ? 'selected' : '';
        const desc = c.descricao.length > 80 ? c.descricao.substring(0, 80) + '...' : c.descricao;
        options += `<option value="${c.id}" ${selected}>${desc}</option>`;
    });
    
    selectCompromisso.innerHTML = options;
}

function addResultadoRow(data = null) {
    const tbody = document.getElementById('gridResultados');
    
    let tipoOptions = '<option value="">Selecione...</option>';
    cachedData.tiposResultado.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(t => {
        const selected = data && data.tipo_resultado_id == t.id ? 'selected' : '';
        tipoOptions += `<option value="${t.id}" ${selected}>${t.nome}</option>`;
    });
    
    let trlOptions = '<option value="">Selecione...</option>';
    for (let i = 1; i <= 8; i++) {
        const selected = data && data.trl == i ? 'selected' : '';
        trlOptions += `<option value="${i}" ${selected}>${i}</option>`;
    }
    const naTrlSelected = data && data.trl === 'N/A' ? 'selected' : '';
    trlOptions += `<option value="N/A" ${naTrlSelected}>N/A</option>`;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><select class="res-tipo">${tipoOptions}</select></td>
        <td><select class="res-trl">${trlOptions}</select></td>
        <td><textarea class="res-descricao" rows="2">${data?.descricao || ''}</textarea></td>
        <td><textarea class="res-comoajuda" rows="2">${data?.como_ajuda || ''}</textarea></td>
        <td><input type="number" class="res-mes" min="1" value="${data?.mes_previsao || ''}"></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
}

function addColaboradorRow(data = null) {
    const tbody = document.getElementById('gridColaboradores');
    
    let colaboradorOptions = '<option value="">Selecione...</option>';
    cachedData.usuarios.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)).forEach(u => {
        const selected = data && data.usuario_id == u.id ? 'selected' : '';
        colaboradorOptions += `<option value="${u.id}" ${selected}>${u.nome_completo}</option>`;
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><select class="colab-usuario">${colaboradorOptions}</select></td>
        <td><input type="text" class="colab-responsabilidade" value="${data?.responsabilidade || ''}"></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
}

function addInstituicaoRow(data = null) {
    const tbody = document.getElementById('gridInstituicoes');
    
    let instituicaoOptions = '<option value="">Selecione...</option>';
    cachedData.instituicoes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(i => {
        const selected = data && data.instituicao_id == i.id ? 'selected' : '';
        instituicaoOptions += `<option value="${i.id}" ${selected}>${i.nome}</option>`;
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><select class="inst-instituicao">${instituicaoOptions}</select></td>
        <td><input type="text" class="inst-responsabilidade" value="${data?.responsabilidade || ''}"></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
}

function addOrcamentoRow(data = null) {
    const tbody = document.getElementById('gridOrcamentos');
    
    let fonteOptions = '<option value="">Selecione...</option>';
    cachedData.fontes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(f => {
        const selected = data && data.fonte_financiadora_id == f.id ? 'selected' : '';
        fonteOptions += `<option value="${f.id}" ${selected}>${f.nome}</option>`;
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><select class="orc-fonte">${fonteOptions}</select></td>
        <td><input type="number" class="orc-valor" step="0.01" min="0" value="${data?.valor_estimado || ''}"></td>
        <td><input type="number" class="orc-percentual" step="0.01" min="0" max="100" value="${data?.percentual || ''}"></td>
        <td><select class="orc-edital"><option value="false" ${data && !data.tem_edital ? 'selected' : ''}>Não</option><option value="true" ${data && data.tem_edital ? 'selected' : ''}>Sim</option></select></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
}

function addRiscoRow(data = null) {
    const tbody = document.getElementById('gridRiscos');
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><textarea class="risco-descricao" rows="2">${data?.descricao || ''}</textarea></td>
        <td><select class="risco-probabilidade"><option value="">Selecione...</option><option value="Alta" ${data?.probabilidade === 'Alta' ? 'selected' : ''}>Alta</option><option value="Média" ${data?.probabilidade === 'Média' ? 'selected' : ''}>Média</option><option value="Baixa" ${data?.probabilidade === 'Baixa' ? 'selected' : ''}>Baixa</option></select></td>
        <td><select class="risco-impacto"><option value="">Selecione...</option><option value="Alto" ${data?.impacto === 'Alto' ? 'selected' : ''}>Alto</option><option value="Médio" ${data?.impacto === 'Médio' ? 'selected' : ''}>Médio</option><option value="Baixo" ${data?.impacto === 'Baixo' ? 'selected' : ''}>Baixo</option></select></td>
        <td><select class="risco-resposta"><option value="">Selecione...</option><option value="Evitar" ${data?.resposta === 'Evitar' ? 'selected' : ''}>Evitar</option><option value="Minimizar" ${data?.resposta === 'Minimizar' ? 'selected' : ''}>Minimizar</option><option value="Aceitar" ${data?.resposta === 'Aceitar' ? 'selected' : ''}>Aceitar</option><option value="Transferir" ${data?.resposta === 'Transferir' ? 'selected' : ''}>Transferir</option></select></td>
        <td><textarea class="risco-descricao-resposta" rows="2">${data?.descricao_resposta || ''}</textarea></td>
        <td><button type="button" class="btn-icon remove" onclick="this.closest('tr').remove()"><i class="fas fa-minus"></i></button></td>
    `;
    
    tbody.appendChild(row);
}

// Salvar TIP
async function salvarTIPRascunho() {
    const tipData = coletarDadosFormulario();
    if (!tipData) return;
    
    try {
        const tipId = document.getElementById('tipId').value;
        
        if (tipId) {
            await supabaseClient.from('tips').update({
                solicitante_id: tipData.solicitante_id,
                titulo: tipData.titulo,
                prazo_execucao: tipData.prazo_execucao,
                objetivo: tipData.objetivo,
                problema_oportunidade_justificativa: tipData.problema_oportunidade_justificativa,
                updated_at: new Date().toISOString()
            }).eq('id', tipId);
            
            await atualizarGridsTIP(tipId, tipData);
            showToast('TIP atualizado com sucesso!', 'success');
        } else {
            const { data: newTip, error } = await supabaseClient.from('tips').insert({
                solicitante_id: tipData.solicitante_id,
                titulo: tipData.titulo,
                prazo_execucao: tipData.prazo_execucao,
                objetivo: tipData.objetivo,
                problema_oportunidade_justificativa: tipData.problema_oportunidade_justificativa,
                status: 'Rascunho'
            }).select().single();
            
            if (error) throw error;
            
            await inserirGridsTIP(newTip.id, tipData);
            await registrarHistorico(newTip.id, null, 'Rascunho', 'Solicitante', 'TIP criado');
            
            document.getElementById('tipId').value = newTip.id;
            editingTipId = newTip.id;
            
            showToast('TIP criado com sucesso!', 'success');
        }
    } catch (err) {
        console.error('Erro ao salvar TIP:', err);
        showToast('Erro ao salvar TIP', 'error');
    }
}

function coletarDadosFormulario() {
    const solicitante_id = document.getElementById('solicitante').value;
    const titulo = document.getElementById('tituloProposta').value;
    const prazo_execucao = document.getElementById('prazoExecucao').value;
    const objetivo = document.getElementById('objetivo').value;
    const problema_oportunidade_justificativa = document.getElementById('problemaOportunidade').value;
    
    if (!solicitante_id || !titulo || !prazo_execucao || !objetivo || !problema_oportunidade_justificativa) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return null;
    }
    
    const alinhamentos = [];
    document.querySelectorAll('#gridAlinhamentos tr').forEach(row => {
        const portfolio_id = row.querySelector('.alin-portfolio')?.value;
        const desafio_inovacao_id = row.querySelector('.alin-desafio')?.value;
        const compromisso_id = row.querySelector('.alin-compromisso')?.value;
        if (portfolio_id) alinhamentos.push({ portfolio_id, desafio_inovacao_id, compromisso_id });
    });
    
    const resultados = [];
    document.querySelectorAll('#gridResultados tr').forEach(row => {
        const tipo_resultado_id = row.querySelector('.res-tipo')?.value;
        const trl = row.querySelector('.res-trl')?.value;
        const descricao = row.querySelector('.res-descricao')?.value;
        const como_ajuda = row.querySelector('.res-comoajuda')?.value;
        const mes_previsao = row.querySelector('.res-mes')?.value;
        if (tipo_resultado_id || descricao) resultados.push({ tipo_resultado_id, trl, descricao, como_ajuda, mes_previsao });
    });
    
    const colaboradores = [];
    document.querySelectorAll('#gridColaboradores tr').forEach(row => {
        const usuario_id = row.querySelector('.colab-usuario')?.value;
        const responsabilidade = row.querySelector('.colab-responsabilidade')?.value;
        if (usuario_id) colaboradores.push({ usuario_id, responsabilidade });
    });
    
    const instituicoes = [];
    document.querySelectorAll('#gridInstituicoes tr').forEach(row => {
        const instituicao_id = row.querySelector('.inst-instituicao')?.value;
        const responsabilidade = row.querySelector('.inst-responsabilidade')?.value;
        if (instituicao_id) instituicoes.push({ instituicao_id, responsabilidade });
    });
    
    const orcamentos = [];
    document.querySelectorAll('#gridOrcamentos tr').forEach(row => {
        const fonte_financiadora_id = row.querySelector('.orc-fonte')?.value;
        const valor_estimado = row.querySelector('.orc-valor')?.value;
        const percentual = row.querySelector('.orc-percentual')?.value;
        const tem_edital = row.querySelector('.orc-edital')?.value === 'true';
        if (fonte_financiadora_id) orcamentos.push({ fonte_financiadora_id, valor_estimado, percentual, tem_edital });
    });
    
    const riscos = [];
    document.querySelectorAll('#gridRiscos tr').forEach(row => {
        const descricao = row.querySelector('.risco-descricao')?.value;
        const probabilidade = row.querySelector('.risco-probabilidade')?.value;
        const impacto = row.querySelector('.risco-impacto')?.value;
        const resposta = row.querySelector('.risco-resposta')?.value;
        const descricao_resposta = row.querySelector('.risco-descricao-resposta')?.value;
        if (descricao) riscos.push({ descricao, probabilidade, impacto, resposta, descricao_resposta });
    });
    
    return { solicitante_id, titulo, prazo_execucao, objetivo, problema_oportunidade_justificativa, alinhamentos, resultados, colaboradores, instituicoes, orcamentos, riscos };
}

async function inserirGridsTIP(tipId, tipData) {
    if (tipData.alinhamentos.length > 0) await supabaseClient.from('tip_alinhamentos').insert(tipData.alinhamentos.map(a => ({ ...a, tip_id: tipId })));
    if (tipData.resultados.length > 0) await supabaseClient.from('tip_resultados').insert(tipData.resultados.map(r => ({ ...r, tip_id: tipId })));
    if (tipData.colaboradores.length > 0) await supabaseClient.from('tip_colaboradores').insert(tipData.colaboradores.map(c => ({ ...c, tip_id: tipId })));
    if (tipData.instituicoes.length > 0) await supabaseClient.from('tip_instituicoes').insert(tipData.instituicoes.map(i => ({ ...i, tip_id: tipId })));
    if (tipData.orcamentos.length > 0) await supabaseClient.from('tip_orcamentos').insert(tipData.orcamentos.map(o => ({ ...o, tip_id: tipId })));
    if (tipData.riscos.length > 0) await supabaseClient.from('tip_riscos').insert(tipData.riscos.map(r => ({ ...r, tip_id: tipId })));
}

async function atualizarGridsTIP(tipId, tipData) {
    await Promise.all([
        supabaseClient.from('tip_alinhamentos').delete().eq('tip_id', tipId),
        supabaseClient.from('tip_resultados').delete().eq('tip_id', tipId),
        supabaseClient.from('tip_colaboradores').delete().eq('tip_id', tipId),
        supabaseClient.from('tip_instituicoes').delete().eq('tip_id', tipId),
        supabaseClient.from('tip_orcamentos').delete().eq('tip_id', tipId),
        supabaseClient.from('tip_riscos').delete().eq('tip_id', tipId)
    ]);
    await inserirGridsTIP(tipId, tipData);
}

async function registrarHistorico(tipId, statusAnterior, statusNovo, localizacao, observacao = '') {
    await supabaseClient.from('tip_historico').insert({
        tip_id: tipId, status_anterior: statusAnterior, status_novo: statusNovo,
        usuario_id: currentUser.id, localizacao: localizacao, observacao: observacao
    });
}

// Enviar para Gestor
function enviarParaGestor() {
    supabaseClient.from('usuario_perfis').select('usuario_id, usuarios(id, nome_completo)')
        .eq('perfil_id', cachedData.perfis.find(p => p.nome === 'Gestor')?.id)
        .then(({ data, error }) => {
            if (error) { showToast('Erro ao carregar gestores', 'error'); return; }
            let options = '<option value="">Selecione...</option>';
            if (data) data.forEach(g => { options += `<option value="${g.usuarios.id}">${g.usuarios.nome_completo}</option>`; });
            document.getElementById('selectGestorModal').innerHTML = options;
            document.getElementById('modalGestor').classList.add('active');
        });
}

async function confirmarEnvioGestor() {
    const gestorId = document.getElementById('selectGestorModal').value;
    if (!gestorId) { showToast('Selecione um gestor', 'warning'); return; }
    
    await salvarTIPRascunho();
    const tipId = document.getElementById('tipId').value;
    if (!tipId) { showToast('Erro: TIP não encontrado', 'error'); return; }
    
    try {
        await supabaseClient.from('tips').update({ status: 'Enviado Gestor', gestor_id: gestorId, data_envio_gestor: new Date().toISOString() }).eq('id', tipId);
        await registrarHistorico(tipId, 'Rascunho', 'Enviado Gestor', 'Gestor', 'Enviado para análise do gestor');
        showToast('TIP enviado para o gestor com sucesso!', 'success');
        closeModalGestor();
        showListaTIPs();
    } catch (err) { console.error('Erro ao enviar para gestor:', err); showToast('Erro ao enviar para gestor', 'error'); }
}

function abrirModalParecerGestor(tipId = null) {
    // Se não recebeu tipId como parâmetro, tenta pegar do formulário
    if (!tipId) {
        const tipIdElement = document.getElementById('tipId');
        tipId = tipIdElement ? tipIdElement.value : null;
    }
    
    if (!tipId) {
        showToast('Erro: TIP não encontrado', 'error');
        return;
    }
    
    // Armazenar o tipId para uso no salvar
    currentTipId = tipId;
    
    document.getElementById('modalParecerTitle').textContent = 'Registrar Parecer do Gestor';
    document.getElementById('modalParecerBody').innerHTML = `
        <form id="formParecerGestor">
            <input type="hidden" id="tipIdParecer" value="${tipId}">
            <div class="form-group">
                <label>Parecer *</label>
                <textarea id="textoParecerGestor" class="form-control" rows="6" required placeholder="Digite seu parecer sobre a proposta..."></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="anuenciaGestor"> 
                    <strong>Conceder Anuência</strong> (Confirma que analisou e aprova o encaminhamento para CTI)
                </label>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar Parecer
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModalParecer()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formParecerGestor').addEventListener('submit', salvarParecerGestor);
    document.getElementById('modalParecer').classList.add('active');
}

async function salvarParecerGestor(e) {
    e.preventDefault();
    const parecer = document.getElementById('textoParecerGestor').value;
    const anuencia = document.getElementById('anuenciaGestor').checked;
    
    // Pegar o tipId do campo hidden do modal OU da variável global
    const tipIdElement = document.getElementById('tipIdParecer');
    const tipId = tipIdElement ? tipIdElement.value : currentTipId;
    
    if (!tipId) {
        showToast('Erro: TIP não encontrado', 'error');
        return;
    }
    
    try {
        await supabaseClient.from('tips').update({ 
            parecer_gestor: parecer, 
            data_parecer_gestor: new Date().toISOString(), 
            anuencia_gestor: anuencia, 
            data_anuencia_gestor: anuencia ? new Date().toISOString() : null 
        }).eq('id', tipId);
        
        await registrarHistorico(tipId, 'Enviado Gestor', 'Enviado Gestor', 'Gestor', `Parecer registrado${anuencia ? ' com anuência' : ''}`);
        
        showToast('Parecer registrado com sucesso!', 'success');
        closeModalParecer();
        showListaTIPs();
    } catch (err) { 
        console.error('Erro ao salvar parecer:', err); 
        showToast('Erro ao salvar parecer', 'error'); 
    }
}

async function enviarParaCTI() {
    const tipId = document.getElementById('tipId').value;
    if (!confirm('Confirma o envio do TIP para análise do CTI?')) return;
    
    try {
        await supabaseClient.from('tips').update({ status: 'Enviado CTI', data_envio_cti: new Date().toISOString() }).eq('id', tipId);
        await registrarHistorico(tipId, 'Enviado Gestor', 'Enviado CTI', 'CTI', 'Enviado para análise do CTI');
        showToast('TIP enviado para o CTI com sucesso!', 'success');
        showListaTIPs();
    } catch (err) { console.error('Erro ao enviar para CTI:', err); showToast('Erro ao enviar para CTI', 'error'); }
}

function abrirModalEnviarAdHoc() {
    supabaseClient.from('usuario_perfis').select('usuario_id, usuarios(id, nome_completo)')
        .eq('perfil_id', cachedData.perfis.find(p => p.nome === 'Ad Hoc')?.id)
        .then(({ data, error }) => {
            if (error) { showToast('Erro ao carregar revisores Ad Hoc', 'error'); return; }
            let checkboxes = '';
            if (data) data.forEach(a => { checkboxes += `<div class="checkbox-item"><input type="checkbox" id="adhoc_${a.usuarios.id}" value="${a.usuarios.id}"><label for="adhoc_${a.usuarios.id}">${a.usuarios.nome_completo}</label></div>`; });
            document.getElementById('checkboxAdHocList').innerHTML = checkboxes || '<p>Nenhum revisor Ad Hoc cadastrado.</p>';
            document.getElementById('modalAdHoc').classList.add('active');
        });
}

// Função para abrir modal de envio para Ad Hoc a partir da lista
function abrirModalEnviarAdHocLista(tipId) {
    currentTipId = tipId;
    
    supabaseClient.from('usuario_perfis').select('usuario_id, usuarios(id, nome_completo)')
        .eq('perfil_id', cachedData.perfis.find(p => p.nome === 'Ad Hoc')?.id)
        .then(({ data, error }) => {
            if (error) { showToast('Erro ao carregar revisores Ad Hoc', 'error'); return; }
            let checkboxes = '';
            if (data) data.forEach(a => { checkboxes += `<div class="checkbox-item"><input type="checkbox" id="adhoc_${a.usuarios.id}" value="${a.usuarios.id}"><label for="adhoc_${a.usuarios.id}">${a.usuarios.nome_completo}</label></div>`; });
            document.getElementById('checkboxAdHocList').innerHTML = checkboxes || '<p>Nenhum revisor Ad Hoc cadastrado.</p>';
            
            // Alterar o botão de confirmar para usar a função correta
            document.getElementById('btnConfirmarAdHoc').onclick = confirmarEnvioAdHocLista;
            
            document.getElementById('modalAdHoc').classList.add('active');
        });
}

// Função para confirmar envio para Ad Hoc a partir da lista
async function confirmarEnvioAdHocLista() {
    const tipId = currentTipId;
    const adhocSelecionados = [];
    document.querySelectorAll('#checkboxAdHocList input:checked').forEach(cb => { adhocSelecionados.push(parseInt(cb.value)); });
    if (adhocSelecionados.length === 0) { showToast('Selecione pelo menos um revisor Ad Hoc', 'warning'); return; }
    
    try {
        const adhocInserts = adhocSelecionados.map(adhocId => ({ tip_id: parseInt(tipId), adhoc_id: adhocId, data_envio: new Date().toISOString() }));
        await supabaseClient.from('tip_adhoc').insert(adhocInserts);
        await registrarHistorico(tipId, 'Enviado CTI', 'Enviado CTI', 'Ad Hoc', `Enviado para ${adhocSelecionados.length} revisor(es)`);
        showToast('TIP enviado para os revisores Ad Hoc!', 'success');
        closeModalAdHoc();
        
        // Restaurar o onclick original
        document.getElementById('btnConfirmarAdHoc').onclick = confirmarEnvioAdHoc;
        
        showListaTIPs();
    } catch (err) { 
        console.error('Erro ao enviar para Ad Hoc:', err); 
        showToast('Erro ao enviar para Ad Hoc', 'error'); 
    }
}

// Função para aprovar TIP a partir da lista
function aprovarTIPLista(tipId) {
    currentTipId = tipId;
    
    document.getElementById('modalParecerTitle').textContent = 'Aprovar TIP - Parecer do CTI';
    document.getElementById('modalParecerBody').innerHTML = `
        <form id="formAprovarCTI">
            <input type="hidden" id="tipIdAprovarCTI" value="${tipId}">
            <div class="form-group">
                <label>Parecer do CTI (opcional)</label>
                <textarea id="parecerAprovacaoCTI" class="form-control" rows="12" placeholder="Digite o parecer de aprovação..."></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-check"></i> Confirmar Aprovação
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModalParecer()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formAprovarCTI').addEventListener('submit', confirmarAprovacaoCTI);
    document.getElementById('modalParecer').classList.add('active');
}

// Função para confirmar aprovação do CTI
async function confirmarAprovacaoCTI(e) {
    e.preventDefault();
    
    const tipId = document.getElementById('tipIdAprovarCTI').value || currentTipId;
    const parecer = document.getElementById('parecerAprovacaoCTI').value;
    
    if (!confirm('Confirma a APROVAÇÃO deste TIP?')) return;
    
    try {
        const updateData = { 
            status: 'Aprovado CTI', 
            data_aprovacao_cti: new Date().toISOString(),
            parecer_cti: parecer || null
        };
        
        const { data, error } = await supabaseClient
            .from('tips')
            .update(updateData)
            .eq('id', tipId)
            .select();
        
        if (error) {
            console.error('Erro ao aprovar TIP:', error);
            showToast('Erro ao aprovar TIP: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            showToast('Erro: TIP não encontrado ou não atualizado', 'error');
            return;
        }
        
        await registrarHistorico(tipId, 'Enviado CTI', 'Aprovado CTI', 'CTI', parecer ? `TIP aprovado: ${parecer}` : 'TIP aprovado');
        showToast('TIP aprovado com sucesso!', 'success');
        closeModalParecer();
        showListaTIPs();
    } catch (err) { 
        console.error('Erro ao aprovar TIP:', err); 
        showToast('Erro ao aprovar TIP: ' + err.message, 'error'); 
    }
}

// Função para reprovar TIP a partir da lista
function reprovarTIPLista(tipId) {
    currentTipId = tipId;
    
    document.getElementById('modalParecerTitle').textContent = 'Reprovar TIP - Parecer do CTI';
    document.getElementById('modalParecerBody').innerHTML = `
        <form id="formReprovarCTI">
            <input type="hidden" id="tipIdReprovarCTI" value="${tipId}">
            <div class="form-group">
                <label>Motivo da Reprovação *</label>
                <textarea id="parecerReprovacaoCTI" class="form-control" rows="12" required placeholder="Informe o motivo da reprovação..."></textarea>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-danger">
                    <i class="fas fa-times"></i> Confirmar Reprovação
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModalParecer()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formReprovarCTI').addEventListener('submit', confirmarReprovacaoCTI);
    document.getElementById('modalParecer').classList.add('active');
}

// Função para confirmar reprovação do CTI
async function confirmarReprovacaoCTI(e) {
    e.preventDefault();
    
    const tipId = document.getElementById('tipIdReprovarCTI').value || currentTipId;
    const motivo = document.getElementById('parecerReprovacaoCTI').value;
    
    if (!motivo) {
        showToast('É necessário informar o motivo da reprovação', 'warning');
        return;
    }
    
    if (!confirm('Confirma a REPROVAÇÃO deste TIP?')) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('tips')
            .update({ 
                status: 'Reprovado CTI', 
                data_reprovacao_cti: new Date().toISOString(), 
                motivo_reprovacao: motivo,
                parecer_cti: motivo
            })
            .eq('id', tipId)
            .select();
        
        if (error) {
            console.error('Erro ao reprovar TIP:', error);
            showToast('Erro ao reprovar TIP: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            showToast('Erro: TIP não encontrado ou não atualizado', 'error');
            return;
        }
        
        await registrarHistorico(tipId, 'Enviado CTI', 'Reprovado CTI', 'CTI', `Reprovado: ${motivo}`);
        showToast('TIP reprovado', 'warning');
        closeModalParecer();
        showListaTIPs();
    } catch (err) { 
        console.error('Erro ao reprovar TIP:', err); 
        showToast('Erro ao reprovar TIP: ' + err.message, 'error'); 
    }
}
async function confirmarEnvioAdHoc() {
    const tipId = document.getElementById('tipId').value;
    const adhocSelecionados = [];
    document.querySelectorAll('#checkboxAdHocList input:checked').forEach(cb => { adhocSelecionados.push(parseInt(cb.value)); });
    if (adhocSelecionados.length === 0) { showToast('Selecione pelo menos um revisor Ad Hoc', 'warning'); return; }
    
    try {
        const adhocInserts = adhocSelecionados.map(adhocId => ({ tip_id: parseInt(tipId), adhoc_id: adhocId, data_envio: new Date().toISOString() }));
        await supabaseClient.from('tip_adhoc').insert(adhocInserts);
        await registrarHistorico(tipId, 'Enviado CTI', 'Enviado CTI', 'Ad Hoc', `Enviado para ${adhocSelecionados.length} revisor(es)`);
        showToast('TIP enviado para os revisores Ad Hoc!', 'success');
        closeModalAdHoc();
        showFormularioTIP(parseInt(tipId));
    } catch (err) { console.error('Erro ao enviar para Ad Hoc:', err); showToast('Erro ao enviar para Ad Hoc', 'error'); }
}

function abrirModalParecerAdHoc() {
    document.getElementById('modalParecerTitle').textContent = 'Registrar Parecer Ad Hoc';
    document.getElementById('modalParecerBody').innerHTML = `
        <form id="formParecerAdHoc">
            <div class="form-group"><label>Parecer *</label><textarea id="textoParecerAdHoc" class="form-control" rows="6" required placeholder="Digite sua análise..."></textarea></div>
            <div class="form-group"><label>Resultado da Análise *</label><select id="resultadoAdHoc" class="form-control" required><option value="">Selecione...</option><option value="Aprovada">Aprovada</option><option value="Aprovada com Ajustes">Aprovada com Ajustes</option></select></div>
            <div class="modal-actions"><button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salvar</button><button type="button" class="btn btn-secondary" onclick="closeModalParecer()">Cancelar</button></div>
        </form>
    `;
    document.getElementById('formParecerAdHoc').addEventListener('submit', salvarParecerAdHoc);
    document.getElementById('modalParecer').classList.add('active');
}

// Função para abrir modal de parecer Ad Hoc a partir da lista
function abrirModalParecerAdHocLista(tipId) {
    currentTipId = tipId;
    
    document.getElementById('modalParecerTitle').textContent = 'Registrar Parecer Ad Hoc';
    document.getElementById('modalParecerBody').innerHTML = `
        <form id="formParecerAdHocLista">
            <input type="hidden" id="tipIdParecerAdHoc" value="${tipId}">
            <div class="form-group">
                <label>Parecer *</label>
                <textarea id="textoParecerAdHocLista" class="form-control" rows="6" required placeholder="Digite sua análise..."></textarea>
            </div>
            <div class="form-group">
                <label>Resultado da Análise *</label>
                <select id="resultadoAdHocLista" class="form-control" required>
                    <option value="">Selecione...</option>
                    <option value="Aprovada">Aprovada</option>
                    <option value="Aprovada com Ajustes">Aprovada com Ajustes</option>
                </select>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-success">
                    <i class="fas fa-save"></i> Salvar
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModalParecer()">
                    Cancelar
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('formParecerAdHocLista').addEventListener('submit', salvarParecerAdHocLista);
    document.getElementById('modalParecer').classList.add('active');
}

// Função para salvar parecer Ad Hoc a partir da lista
async function salvarParecerAdHocLista(e) {
    e.preventDefault();
    
    const parecer = document.getElementById('textoParecerAdHocLista').value;
    const resultado = document.getElementById('resultadoAdHocLista').value;
    const tipId = document.getElementById('tipIdParecerAdHoc').value || currentTipId;
    
    if (!tipId) {
        showToast('Erro: TIP não encontrado', 'error');
        return;
    }
    
    try {
        await supabaseClient
            .from('tip_adhoc')
            .update({ 
                parecer: parecer, 
                resultado: resultado, 
                data_parecer: new Date().toISOString() 
            })
            .eq('tip_id', tipId)
            .eq('adhoc_id', currentUser.id);
        
        await registrarHistorico(tipId, 'Enviado CTI', 'Enviado CTI', 'Ad Hoc', `Parecer registrado: ${resultado}`);
        
        showToast('Parecer registrado com sucesso!', 'success');
        closeModalParecer();
        showListaTIPs();
    } catch (err) { 
        console.error('Erro ao salvar parecer Ad Hoc:', err); 
        showToast('Erro ao salvar parecer', 'error'); 
    }
}


async function salvarParecerAdHoc(e) {
    e.preventDefault();
    const parecer = document.getElementById('textoParecerAdHoc').value;
    const resultado = document.getElementById('resultadoAdHoc').value;
    const tipId = document.getElementById('tipId').value;
    
    try {
        await supabaseClient.from('tip_adhoc').update({ parecer: parecer, resultado: resultado, data_parecer: new Date().toISOString() }).eq('tip_id', tipId).eq('adhoc_id', currentUser.id);
        await registrarHistorico(tipId, 'Enviado CTI', 'Enviado CTI', 'Ad Hoc', `Parecer registrado: ${resultado}`);
        showToast('Parecer registrado com sucesso!', 'success');
        closeModalParecer();
        showFormularioTIP(parseInt(tipId));
    } catch (err) { console.error('Erro ao salvar parecer Ad Hoc:', err); showToast('Erro ao salvar parecer', 'error'); }
}

function aprovarTIP() {
    const tipId = document.getElementById('tipId').value;
    if (!tipId) {
        showToast('Erro: TIP não encontrado', 'error');
        return;
    }
    aprovarTIPLista(tipId);
}


function reprovarTIP() {
    const tipId = document.getElementById('tipId').value;
    if (!tipId) {
        showToast('Erro: TIP não encontrado', 'error');
        return;
    }
    reprovarTIPLista(tipId);
}

// =============================================
// LISTA DE TIPs
// =============================================
async function showListaTIPs() {
    document.getElementById('pageTitle').textContent = 'Lista dos TIPs';
    
    const isCTI = currentUserPerfis.includes('CTI');
    const isGestor = currentUserPerfis.includes('Gestor');
    const isAdHoc = currentUserPerfis.includes('Ad Hoc');
    
    let tips = [];
    let adhocPendentes = []; // Lista de tip_ids com parecer pendente para o Ad Hoc atual
    
    // Se for Ad Hoc, buscar os TIPs com parecer pendente
    if (isAdHoc) {
        const { data: pendentes } = await supabaseClient
            .from('tip_adhoc')
            .select('tip_id')
            .eq('adhoc_id', currentUser.id)
            .is('parecer', null);
        
        adhocPendentes = pendentes ? pendentes.map(p => p.tip_id) : [];
    }
    
    if (isCTI) {
        // CTI vê todos os TIPs
        const { data, error } = await supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .order('created_at', { ascending: false });
        if (error) { showToast('Erro ao carregar TIPs', 'error'); return; }
        tips = data || [];
    } else if (isAdHoc) {
        // Ad Hoc vê os TIPs que foram enviados para ele + seus próprios TIPs
        const { data: adhocTips, error: adhocError } = await supabaseClient
            .from('tip_adhoc')
            .select('tip_id')
            .eq('adhoc_id', currentUser.id);
        
        if (adhocError) { showToast('Erro ao carregar TIPs', 'error'); return; }
        
        const tipIds = adhocTips ? adhocTips.map(t => t.tip_id) : [];
        
        if (tipIds.length > 0) {
            const { data, error } = await supabaseClient
                .from('tips')
                .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
                .or(`id.in.(${tipIds.join(',')}),solicitante_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false });
            if (error) { showToast('Erro ao carregar TIPs', 'error'); return; }
            tips = data || [];
        } else {
            // Se não tem TIPs como Ad Hoc, busca apenas os próprios
            const { data, error } = await supabaseClient
                .from('tips')
                .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
                .eq('solicitante_id', currentUser.id)
                .order('created_at', { ascending: false });
            if (error) { showToast('Erro ao carregar TIPs', 'error'); return; }
            tips = data || [];
        }
    } else if (isGestor) {
        // Gestor vê seus TIPs + TIPs enviados para ele
        const { data, error } = await supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .or(`solicitante_id.eq.${currentUser.id},gestor_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });
        if (error) { showToast('Erro ao carregar TIPs', 'error'); return; }
        tips = data || [];
    } else {
        // Solicitante vê apenas seus próprios TIPs
        const { data, error } = await supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .eq('solicitante_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) { showToast('Erro ao carregar TIPs', 'error'); return; }
        tips = data || [];
    }
    
    let tableRows = '';
    if (tips && tips.length > 0) {
        tips.forEach(tip => {
            const statusClass = getStatusClass(tip.status);
            const canEdit = (tip.status === 'Rascunho' || tip.status === 'Enviado Gestor') && (tip.solicitante_id === currentUser.id || isCTI);
            const canDelete = tip.status === 'Rascunho' && tip.solicitante_id === currentUser.id;
            
            // Verificar se o gestor pode registrar parecer
            const canParecer = isGestor && tip.status === 'Enviado Gestor' && tip.gestor_id === currentUser.id && !tip.parecer_gestor;

            // Verificar se CTI pode realizar ações
            const canCTIActions = isCTI && tip.status === 'Enviado CTI';

            // Verificar se Ad Hoc pode registrar parecer
            const canParecerAdHoc = isAdHoc && adhocPendentes.includes(tip.id);

            tableRows += `
                <tr>
                    <td>${tip.numero_tip || 'Pendente'}</td>
                    <td>${tip.titulo ? (tip.titulo.length > 50 ? tip.titulo.substring(0, 50) + '...' : tip.titulo) : '-'}</td>
                    <td>${tip.solicitante?.nome_completo || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${tip.status}</span></td>
                    <td>${formatDate(tip.created_at)}</td>
                    <td class="actions-cell">
                        <button class="btn-icon view" onclick="visualizarTIP(${tip.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                        ${canEdit ? `<button class="btn-icon edit" onclick="showFormularioTIP(${tip.id})" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                        ${canParecer ? `<button class="btn-icon parecer" onclick="abrirModalParecerGestor(${tip.id})" title="Registrar Parecer"><i class="fas fa-clipboard-check"></i></button>` : ''}
                        ${canParecerAdHoc ? `<button class="btn-icon adhoc-parecer" onclick="abrirModalParecerAdHocLista(${tip.id})" title="Registrar Parecer Ad Hoc"><i class="fas fa-user-edit"></i></button>` : ''}
                        ${canCTIActions ? `<button class="btn-icon adhoc" onclick="abrirModalEnviarAdHocLista(${tip.id})" title="Enviar para Ad Hoc"><i class="fas fa-user-tag"></i></button>` : ''}
                        ${canCTIActions ? `<button class="btn-icon approve" onclick="aprovarTIPLista(${tip.id})" title="Aprovar TIP"><i class="fas fa-check"></i></button>` : ''}
                        ${canCTIActions ? `<button class="btn-icon reject" onclick="reprovarTIPLista(${tip.id})" title="Reprovar TIP"><i class="fas fa-times"></i></button>` : ''}
                        <button class="btn-icon pdf" onclick="exportarPDF(${tip.id})" title="Exportar PDF"><i class="fas fa-file-pdf"></i></button>
                        <button class="btn-icon history" onclick="verHistorico(${tip.id})" title="Histórico"><i class="fas fa-history"></i></button>
                        ${canDelete ? `<button class="btn-icon delete" onclick="excluirTIP(${tip.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="6" style="text-align: center;">Nenhum TIP encontrado.</td></tr>';
    }
    
    document.getElementById('pageContent').innerHTML = `
        <div class="card fade-in">
            <div class="card-header"><h3>TIPs Cadastrados</h3></div>
            <div class="card-body">
                <div class="filter-bar">
                    <label>Filtrar por Status:</label>
                    <select id="filtroStatus" onchange="filtrarTIPs()">
                        <option value="">Todos</option>
                        <option value="Rascunho">Rascunho</option>
                        <option value="Enviado Gestor">Enviado Gestor</option>
                        <option value="Enviado CTI">Enviado CTI</option>
                        <option value="Aprovado CTI">Aprovado CTI</option>
                        <option value="Reprovado CTI">Reprovado CTI</option>
                    </select>
                    <button class="btn btn-success" onclick="showFormularioTIP()"><i class="fas fa-plus"></i> Novo TIP</button>
                </div>
                <table class="tips-table">
                    <thead><tr><th>Número</th><th>Título</th><th>Solicitante</th><th>Status</th><th>Data Criação</th><th>Ações</th></tr></thead>
                    <tbody id="tipsTableBody">${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    switch (status) {
        case 'Rascunho': return 'status-rascunho';
        case 'Enviado Gestor': return 'status-enviado-gestor';
        case 'Enviado CTI': return 'status-enviado-cti';
        case 'Aprovado CTI': return 'status-aprovado';
        case 'Reprovado CTI': return 'status-reprovado';
        default: return '';
    }
}

async function filtrarTIPs() {
    const filtroStatus = document.getElementById('filtroStatus').value;
    const isCTI = currentUserPerfis.includes('CTI');
    const isGestor = currentUserPerfis.includes('Gestor');
    const isAdHoc = currentUserPerfis.includes('Ad Hoc');
    
    let tips = [];
    let adhocPendentes = []; // Lista de tip_ids com parecer pendente para o Ad Hoc atual
    
    // Se for Ad Hoc, buscar os TIPs com parecer pendente
    if (isAdHoc) {
        const { data: pendentes } = await supabaseClient
            .from('tip_adhoc')
            .select('tip_id')
            .eq('adhoc_id', currentUser.id)
            .is('parecer', null);
        
        adhocPendentes = pendentes ? pendentes.map(p => p.tip_id) : [];
    }
    
    if (isCTI) {
        // CTI vê todos os TIPs
        let query = supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .order('created_at', { ascending: false });
        if (filtroStatus) query = query.eq('status', filtroStatus);
        const { data, error } = await query;
        if (error) { showToast('Erro ao filtrar TIPs', 'error'); return; }
        tips = data || [];
    } else if (isAdHoc) {
        // Ad Hoc vê os TIPs que foram enviados para ele + seus próprios TIPs
        const { data: adhocTips, error: adhocError } = await supabaseClient
            .from('tip_adhoc')
            .select('tip_id')
            .eq('adhoc_id', currentUser.id);
        
        if (adhocError) { showToast('Erro ao filtrar TIPs', 'error'); return; }
        
        const tipIds = adhocTips ? adhocTips.map(t => t.tip_id) : [];
        
        if (tipIds.length > 0) {
            let query = supabaseClient
                .from('tips')
                .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
                .or(`id.in.(${tipIds.join(',')}),solicitante_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false });
            if (filtroStatus) query = query.eq('status', filtroStatus);
            const { data, error } = await query;
            if (error) { showToast('Erro ao filtrar TIPs', 'error'); return; }
            tips = data || [];
        } else {
            let query = supabaseClient
                .from('tips')
                .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
                .eq('solicitante_id', currentUser.id)
                .order('created_at', { ascending: false });
            if (filtroStatus) query = query.eq('status', filtroStatus);
            const { data, error } = await query;
            if (error) { showToast('Erro ao filtrar TIPs', 'error'); return; }
            tips = data || [];
        }
    } else if (isGestor) {
        let query = supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .or(`solicitante_id.eq.${currentUser.id},gestor_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });
        if (filtroStatus) query = query.eq('status', filtroStatus);
        const { data, error } = await query;
        if (error) { showToast('Erro ao filtrar TIPs', 'error'); return; }
        tips = data || [];
    } else {
        let query = supabaseClient
            .from('tips')
            .select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`)
            .eq('solicitante_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (filtroStatus) query = query.eq('status', filtroStatus);
        const { data, error } = await query;
        if (error) { showToast('Erro ao filtrar TIPs', 'error'); return; }
        tips = data || [];
    }
    
    let tableRows = '';
    if (tips && tips.length > 0) {
        tips.forEach(tip => {
            const statusClass = getStatusClass(tip.status);
            const canEdit = (tip.status === 'Rascunho' || tip.status === 'Enviado Gestor') && (tip.solicitante_id === currentUser.id || isCTI);
            const canDelete = tip.status === 'Rascunho' && tip.solicitante_id === currentUser.id;
            const titulo = tip.titulo ? (tip.titulo.length > 50 ? tip.titulo.substring(0, 50) + '...' : tip.titulo) : '-';
            
            // Verificar se o gestor pode registrar parecer
            const canParecer = isGestor && tip.status === 'Enviado Gestor' && tip.gestor_id === currentUser.id && !tip.parecer_gestor;

            // Verificar se CTI pode realizar ações
            const canCTIActions = isCTI && tip.status === 'Enviado CTI';

            // Verificar se Ad Hoc pode registrar parecer
            const canParecerAdHoc = isAdHoc && adhocPendentes.includes(tip.id);

            tableRows += '<tr>';
            tableRows += '<td>' + (tip.numero_tip || 'Pendente') + '</td>';
            tableRows += '<td>' + titulo + '</td>';
            tableRows += '<td>' + (tip.solicitante?.nome_completo || '-') + '</td>';
            tableRows += '<td><span class="status-badge ' + statusClass + '">' + tip.status + '</span></td>';
            tableRows += '<td>' + formatDate(tip.created_at) + '</td>';
            tableRows += '<td class="actions-cell">';
            tableRows += '<button class="btn-icon view" onclick="visualizarTIP(' + tip.id + ')" title="Visualizar"><i class="fas fa-eye"></i></button>';
            if (canEdit) {
                tableRows += '<button class="btn-icon edit" onclick="showFormularioTIP(' + tip.id + ')" title="Editar"><i class="fas fa-edit"></i></button>';
            }
            if (canParecer) {
                tableRows += '<button class="btn-icon parecer" onclick="abrirModalParecerGestor(' + tip.id + ')" title="Registrar Parecer"><i class="fas fa-clipboard-check"></i></button>';
            }
            if (canParecerAdHoc) {
                tableRows += '<button class="btn-icon adhoc-parecer" onclick="abrirModalParecerAdHocLista(' + tip.id + ')" title="Registrar Parecer Ad Hoc"><i class="fas fa-user-edit"></i></button>';
            }
            if (canCTIActions) {
                tableRows += '<button class="btn-icon adhoc" onclick="abrirModalEnviarAdHocLista(' + tip.id + ')" title="Enviar para Ad Hoc"><i class="fas fa-user-tag"></i></button>';
                tableRows += '<button class="btn-icon approve" onclick="aprovarTIPLista(' + tip.id + ')" title="Aprovar TIP"><i class="fas fa-check"></i></button>';
                tableRows += '<button class="btn-icon reject" onclick="reprovarTIPLista(' + tip.id + ')" title="Reprovar TIP"><i class="fas fa-times"></i></button>';
            }
            tableRows += '<button class="btn-icon pdf" onclick="exportarPDF(' + tip.id + ')" title="Exportar PDF"><i class="fas fa-file-pdf"></i></button>';
            tableRows += '<button class="btn-icon history" onclick="verHistorico(' + tip.id + ')" title="Histórico"><i class="fas fa-history"></i></button>';
            if (canDelete) {
                tableRows += '<button class="btn-icon delete" onclick="excluirTIP(' + tip.id + ')" title="Excluir"><i class="fas fa-trash"></i></button>';
            }
            tableRows += '</td>';
            tableRows += '</tr>';
        });
    } else {
        tableRows = '<tr><td colspan="6" style="text-align: center;">Nenhum TIP encontrado.</td></tr>';
    }
    document.getElementById('tipsTableBody').innerHTML = tableRows;
}

async function excluirTIP(id) {
    if (!confirm('Deseja realmente excluir este TIP?')) return;
    
    try {
        await Promise.all([
            supabaseClient.from('tip_alinhamentos').delete().eq('tip_id', id),
            supabaseClient.from('tip_resultados').delete().eq('tip_id', id),
            supabaseClient.from('tip_colaboradores').delete().eq('tip_id', id),
            supabaseClient.from('tip_instituicoes').delete().eq('tip_id', id),
            supabaseClient.from('tip_orcamentos').delete().eq('tip_id', id),
            supabaseClient.from('tip_riscos').delete().eq('tip_id', id),
            supabaseClient.from('tip_historico').delete().eq('tip_id', id),
            supabaseClient.from('tip_adhoc').delete().eq('tip_id', id)
        ]);
        await supabaseClient.from('tips').delete().eq('id', id);
        showToast('TIP excluído com sucesso!', 'success');
        showListaTIPs();
    } catch (err) { console.error('Erro ao excluir TIP:', err); showToast('Erro ao excluir TIP', 'error'); }
}

// Visualizar TIP
async function visualizarTIP(tipId) {
    const { data: tip, error } = await supabaseClient.from('tips').select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`).eq('id', tipId).single();
    if (error) { showToast('Erro ao carregar TIP', 'error'); return; }
    
    const [alinRes, resRes, colRes, instRes, orcRes, riscRes, adhocRes] = await Promise.all([
        supabaseClient.from('tip_alinhamentos').select('*, portfolios(nome), desafios_inovacao(descricao), compromissos(descricao)').eq('tip_id', tipId),
        supabaseClient.from('tip_resultados').select('*, tipos_resultado(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_colaboradores').select('*, usuarios(nome_completo)').eq('tip_id', tipId),
        supabaseClient.from('tip_instituicoes').select('*, instituicoes_parceiras(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_orcamentos').select('*, fontes_financiadoras(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_riscos').select('*').eq('tip_id', tipId),
        supabaseClient.from('tip_adhoc').select('*, usuarios:adhoc_id(nome_completo)').eq('tip_id', tipId)
    ]);
    
    const isCTI = currentUserPerfis.includes('CTI');
    
    let html = `
        <div class="tip-view-header">
            <h2>Termo de Intenção de Projeto (TIP)</h2>
            <p><strong>${tip.numero_tip || 'Número Pendente'}</strong></p>
            <span class="tip-view-status status-badge ${getStatusClass(tip.status)}">${tip.status}</span>
        </div>
        <div class="view-section">
            <h4 class="view-title">Informações Básicas</h4>
            <div class="view-field"><div class="view-label">Solicitante</div><div class="view-value">${tip.solicitante?.nome_completo || '-'}</div></div>
            <div class="view-field"><div class="view-label">Título da Proposta</div><div class="view-value">${tip.titulo || '-'}</div></div>
            <div class="view-field"><div class="view-label">Prazo Previsto de Execução</div><div class="view-value">${tip.prazo_execucao || '-'} meses</div></div>
        </div>
        <div class="view-section">
            <h4 class="view-title">Alinhamento Estratégico</h4>
            <div class="view-grid"><table><thead><tr><th>Portfolio</th><th>Desafio de Inovação</th><th>Compromisso</th></tr></thead><tbody>${alinRes.data?.map(a => `<tr><td>${a.portfolios?.nome || '-'}</td><td>${a.desafios_inovacao?.descricao || '-'}</td><td>${a.compromissos?.descricao || '-'}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum alinhamento.</td></tr>'}</tbody></table></div>
        </div>
        <div class="view-section"><h4 class="view-title">Objetivo</h4><div class="view-value">${tip.objetivo || '-'}</div></div>
        <div class="view-section"><h4 class="view-title">Problema/Oportunidade/Justificativa</h4><div class="view-value">${tip.problema_oportunidade_justificativa || '-'}</div></div>
        <div class="view-section">
            <h4 class="view-title">Principais Resultados</h4>
            <div class="view-grid"><table><thead><tr><th>Tipo</th><th>TRL</th><th>Descrição</th><th>Como Ajuda</th><th>Mês</th></tr></thead><tbody>${resRes.data?.map(r => `<tr><td>${r.tipos_resultado?.nome || '-'}</td><td>${r.trl || '-'}</td><td>${r.descricao || '-'}</td><td>${r.como_ajuda || '-'}</td><td>${r.mes_previsao || '-'}</td></tr>`).join('') || '<tr><td colspan="5">Nenhum resultado.</td></tr>'}</tbody></table></div>
        </div>
        <div class="view-section">
            <h4 class="view-title">Colaboradores Potenciais</h4>
            <div class="view-grid"><table><thead><tr><th>Nome</th><th>Responsabilidade</th></tr></thead><tbody>${colRes.data?.map(c => `<tr><td>${c.usuarios?.nome_completo || '-'}</td><td>${c.responsabilidade || '-'}</td></tr>`).join('') || '<tr><td colspan="2">Nenhum colaborador.</td></tr>'}</tbody></table></div>
        </div>
        <div class="view-section">
            <h4 class="view-title">Instituições Parceiras</h4>
            <div class="view-grid"><table><thead><tr><th>Instituição</th><th>Responsabilidade</th></tr></thead><tbody>${instRes.data?.map(i => `<tr><td>${i.instituicoes_parceiras?.nome || '-'}</td><td>${i.responsabilidade || '-'}</td></tr>`).join('') || '<tr><td colspan="2">Nenhuma instituição.</td></tr>'}</tbody></table></div>
        </div>
        <div class="view-section">
            <h4 class="view-title">Orçamento e Fontes de Recursos</h4>
            <div class="view-grid"><table><thead><tr><th>Fonte</th><th>Valor (R$)</th><th>%</th><th>Tem Edital?</th></tr></thead><tbody>${orcRes.data?.map(o => `<tr><td>${o.fontes_financiadoras?.nome || '-'}</td><td>${formatMoney(o.valor_estimado)}</td><td>${o.percentual || '-'}%</td><td>${o.tem_edital ? 'Sim' : 'Não'}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum orçamento.</td></tr>'}</tbody></table></div>
        </div>
        <div class="view-section">
            <h4 class="view-title">Riscos</h4>
            <div class="view-grid"><table><thead><tr><th>Descrição</th><th>Probabilidade</th><th>Impacto</th><th>Resposta</th><th>Descrição Resposta</th></tr></thead><tbody>${riscRes.data?.map(r => `<tr><td>${r.descricao || '-'}</td><td>${r.probabilidade || '-'}</td><td>${r.impacto || '-'}</td><td>${r.resposta || '-'}</td><td>${r.descricao_resposta || '-'}</td></tr>`).join('') || '<tr><td colspan="5">Nenhum risco.</td></tr>'}</tbody></table></div>
        </div>
    `;
    
    if (tip.parecer_gestor) {
        html += `<div class="view-section"><h4 class="view-title" style="color: var(--texto-laranja);">Parecer do Gestor</h4><div class="parecer-section"><div class="parecer-content">${tip.parecer_gestor}</div><div class="parecer-meta">Registrado em: ${formatDateTime(tip.data_parecer_gestor)}${tip.anuencia_gestor ? ' | <strong style="color: var(--verde-escuro);">Anuência Concedida</strong>' : ''}</div></div></div>`;
    }
    
    if (isCTI && adhocRes.data?.length > 0) {
        html += `<div class="view-section"><h4 class="view-title" style="color: #8E44AD;">Parecer do Ad Hoc</h4>`;
        adhocRes.data.forEach(p => {
            html += `<div class="parecer-section" style="border-left-color: #8E44AD; margin-bottom: 15px;"><div class="parecer-title">${p.usuarios?.nome_completo || 'Ad Hoc'}</div><div class="parecer-content">${p.parecer || 'Aguardando parecer...'}</div><div class="parecer-meta">${p.resultado ? `Resultado: <strong>${p.resultado}</strong>` : 'Pendente'}${p.data_parecer ? ' | ' + formatDateTime(p.data_parecer) : ''}</div></div>`;
        });
        html += `</div>`;
    }

// Parecer do CTI (Aprovação ou Reprovação)
if (tip.parecer_cti || tip.motivo_reprovacao) {
    const parecerCTI = tip.parecer_cti || tip.motivo_reprovacao;
    const dataParecer = tip.data_aprovacao_cti || tip.data_reprovacao_cti;
    const tipoDecisao = tip.status === 'Aprovado CTI' ? 'Aprovação' : 'Reprovação';
    const corTitulo = tip.status === 'Aprovado CTI' ? 'var(--verde-escuro)' : '#E74C3C';
    
    html += `
        <div class="view-section">
            <h4 class="view-title" style="color: ${corTitulo};">Parecer do CTI - ${tipoDecisao}</h4>
            <div class="parecer-section" style="border-left-color: ${corTitulo};">
                <div class="parecer-content">${parecerCTI}</div>
                <div class="parecer-meta">
                    Registrado em: ${formatDateTime(dataParecer)}
                </div>
            </div>
        </div>
    `;
}
    
    document.getElementById('modalVisualizacaoTitle').textContent = `TIP: ${tip.titulo ? tip.titulo.substring(0, 50) : ''}...`;
    document.getElementById('modalVisualizacaoBody').innerHTML = html;
    document.getElementById('modalVisualizacao').classList.add('active');
}

// Ver Histórico
async function verHistorico(tipId) {
    const { data: historico, error } = await supabaseClient.from('tip_historico').select('*, usuarios(nome_completo)').eq('tip_id', tipId).order('created_at', { ascending: false });
    if (error) { showToast('Erro ao carregar histórico', 'error'); return; }
    
    let html = '<ul class="historico-list">';
    if (historico && historico.length > 0) {
        historico.forEach((h, index) => {
            html += `<li class="historico-item ${index === 0 ? 'current' : ''}"><div class="historico-date">${formatDateTime(h.created_at)}</div><div class="historico-status">${h.status_anterior ? h.status_anterior + ' → ' : ''}${h.status_novo}</div><div class="historico-location"><i class="fas fa-map-marker-alt"></i> Localização: ${h.localizacao}</div>${h.observacao ? `<div style="color: var(--cinza-escuro); font-size: 10px; margin-top: 5px;">${h.observacao}</div>` : ''}<div style="color: var(--texto-azul); font-size: 10px; margin-top: 3px;">Por: ${h.usuarios?.nome_completo || 'Sistema'}</div></li>`;
        });
    } else {
        html = '<p style="text-align: center; color: var(--cinza-escuro);">Nenhum histórico encontrado.</p>';
    }
    html += '</ul>';
    
    document.getElementById('modalHistoricoBody').innerHTML = html;
    document.getElementById('modalHistorico').classList.add('active');
}

// =============================================
// EXPORTAR PDF - VERSÃO MELHORADA
// =============================================
async function exportarPDF(tipId) {
    const { jsPDF } = window.jspdf;
    
    const { data: tip, error } = await supabaseClient.from('tips').select(`*, solicitante:solicitante_id(nome_completo), gestor:gestor_id(nome_completo)`).eq('id', tipId).single();
    if (error) { showToast('Erro ao carregar TIP', 'error'); return; }
    
    const [alinRes, resRes, colRes, instRes, orcRes, riscRes, histRes, adhocRes] = await Promise.all([
        supabaseClient.from('tip_alinhamentos').select('*, portfolios(nome), desafios_inovacao(descricao), compromissos(descricao)').eq('tip_id', tipId),
        supabaseClient.from('tip_resultados').select('*, tipos_resultado(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_colaboradores').select('*, usuarios(nome_completo)').eq('tip_id', tipId),
        supabaseClient.from('tip_instituicoes').select('*, instituicoes_parceiras(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_orcamentos').select('*, fontes_financiadoras(nome)').eq('tip_id', tipId),
        supabaseClient.from('tip_riscos').select('*').eq('tip_id', tipId),
        supabaseClient.from('tip_historico').select('*, usuarios(nome_completo)').eq('tip_id', tipId).order('created_at', { ascending: false }),
        supabaseClient.from('tip_adhoc').select('*, usuarios:adhoc_id(nome_completo)').eq('tip_id', tipId)
    ]);
    
    const isCTI = currentUserPerfis.includes('CTI');
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Cores do tema
    const cores = {
        verde: [29, 131, 72],
        azul: [46, 134, 171],
        laranja: [243, 156, 18],
        cinza: [128, 128, 128],
        cinzaClaro: [245, 245, 245],
        vermelho: [231, 76, 60],
        roxo: [142, 68, 173]
    };
    
    function checkNewPage(height = 20) {
        if (yPos + height > 280) { doc.addPage(); yPos = 20; return true; }
        return false;
    }
    
    // Título de seção simplificado - apenas linha colorida à esquerda
    function addSectionTitle(title, color = cores.azul) {
        checkNewPage(15);
        yPos += 5;
        // Linha colorida à esquerda
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(margin, yPos - 5, 3, 8, 'F');
        // Texto do título
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(title, margin + 6, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        yPos += 10;
    }
    
    // Título de página ANEXOS destacado
    function addAnexosTitle() {
        doc.addPage();
        yPos = 20;
        
        // Fundo com gradiente simulado
        doc.setFillColor(cores.verde[0], cores.verde[1], cores.verde[2]);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // Título ANEXOS
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ANEXOS', pageWidth / 2, 30, { align: 'center' });
        
        // Subtítulo
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(220, 220, 220);
        doc.text('Pareceres e Histórico de Tramitação', pageWidth / 2, 40, { align: 'center' });
        
        // Linha decorativa
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 40, 45, pageWidth / 2 + 40, 45);
        
        yPos = 65;
        doc.setTextColor(0, 0, 0);
    }
    
    // Campo com label colorido e valor - CORRIGIDO com espaçamento
    function addFieldColored(label, value, labelColor = cores.verde) {
        checkNewPage(20);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        doc.text(label + ':  ', margin, yPos);
        
        const labelWidth = doc.getTextWidth(label + ':  ');
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(50, 50, 50);
        
        const valueText = String(value || '-');
        const availableWidth = contentWidth - labelWidth;
        const lines = doc.splitTextToSize(valueText, availableWidth);
        
        // Primeira linha ao lado do label
        doc.text(lines[0] || '-', margin + labelWidth, yPos);
        yPos += 5;
        
        // Linhas subsequentes abaixo
        if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
                checkNewPage(5);
                doc.text(lines[i], margin, yPos);
                yPos += 5;
            }
        }
        yPos += 2;
    }
    
    // Texto justificado com linha grossa à esquerda (sem caixa)
    function addJustifiedTextWithBar(text, barColor = cores.azul) {
        if (!text) {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('Não informado.', margin + 8, yPos);
            yPos += 10;
            return;
        }
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(50, 50, 50);
        
        const textLines = doc.splitTextToSize(String(text), contentWidth - 12);
        const lineHeight = 4.5;
        const totalHeight = textLines.length * lineHeight;
        
        // Verificar se precisa de nova página
        if (yPos + totalHeight > 275) {
            doc.addPage();
            yPos = 20;
        }
        
        // Desenhar barra grossa colorida à esquerda
        doc.setFillColor(barColor[0], barColor[1], barColor[2]);
        doc.rect(margin, yPos - 3, 3, totalHeight + 4, 'F');
        
        // Texto justificado
        textLines.forEach((line, index) => {
            // Justificar texto (distribuir palavras) - exceto última linha
            if (index < textLines.length - 1 && line.trim().length > 0) {
                const words = line.split(' ').filter(w => w.length > 0);
                if (words.length > 1) {
                    const lineWidth = doc.getTextWidth(line);
                    const targetWidth = contentWidth - 12;
                    const extraSpace = (targetWidth - lineWidth) / (words.length - 1);
                    
                    let xPos = margin + 8;
                    words.forEach((word, wIndex) => {
                        doc.text(word, xPos, yPos);
                        xPos += doc.getTextWidth(word) + doc.getTextWidth(' ') + extraSpace;
                    });
                } else {
                    doc.text(line, margin + 8, yPos);
                }
            } else {
                doc.text(line, margin + 8, yPos);
            }
            yPos += lineHeight;
        });
        
        yPos += 5;
    }
    
    // Função para desenhar matriz de riscos
    function drawRiskMatrix(riscos) {
        checkNewPage(75);
        
        // Título da matriz
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(cores.vermelho[0], cores.vermelho[1], cores.vermelho[2]);
        doc.text('MATRIZ DE RISCOS', margin, yPos);
        yPos += 8;
        
        const matrixX = margin + 25;
        const matrixY = yPos;
        const cellSize = 22;
        
        // Cores da matriz (baseadas em probabilidade x impacto)
        // Linhas: Alta(0), Média(1), Baixa(2) - de cima para baixo
        // Colunas: Baixo(0), Médio(1), Alto(2) - da esquerda para direita
        const matrixColors = [
            [[243, 156, 18], [231, 76, 60], [231, 76, 60]],    // Alta probabilidade
            [[88, 214, 141], [243, 156, 18], [231, 76, 60]],   // Média probabilidade
            [[88, 214, 141], [88, 214, 141], [243, 156, 18]]   // Baixa probabilidade
        ];
        
        // Contar riscos em cada célula
        const riskCount = {
            'Alta_Baixo': 0, 'Alta_Médio': 0, 'Alta_Alto': 0,
            'Média_Baixo': 0, 'Média_Médio': 0, 'Média_Alto': 0,
            'Baixa_Baixo': 0, 'Baixa_Médio': 0, 'Baixa_Alto': 0
        };
        
        riscos.forEach(r => {
            const key = `${r.probabilidade}_${r.impacto}`;
            if (riskCount.hasOwnProperty(key)) {
                riskCount[key]++;
            }
        });
        
        // Mapear para posições na matriz
        const probMap = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
        const impMap = { 'Baixo': 0, 'Médio': 1, 'Alto': 2 };
        
        // Desenhar células da matriz
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const color = matrixColors[row][col];
                doc.setFillColor(color[0], color[1], color[2]);
                doc.rect(matrixX + col * cellSize, matrixY + row * cellSize, cellSize, cellSize, 'F');
                
                // Borda branca
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(1);
                doc.rect(matrixX + col * cellSize, matrixY + row * cellSize, cellSize, cellSize, 'S');
            }
        }
        
        // Desenhar contagem de riscos nas células
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        
        const probLabels = ['Alta', 'Média', 'Baixa'];
        const impLabels = ['Baixo', 'Médio', 'Alto'];
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const prob = probLabels[row];
                const imp = impLabels[col];
                const count = riskCount[`${prob}_${imp}`] || 0;
                
                const x = matrixX + col * cellSize + cellSize / 2;
                const y = matrixY + row * cellSize + cellSize / 2 + 4;
                
                doc.text(String(count), x, y, { align: 'center' });
            }
        }
        
        // Labels do eixo X (Impacto) - abaixo da matriz
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');
        doc.text('Baixo', matrixX + cellSize * 0.5, matrixY + cellSize * 3 + 6, { align: 'center' });
        doc.text('Médio', matrixX + cellSize * 1.5, matrixY + cellSize * 3 + 6, { align: 'center' });
        doc.text('Alto', matrixX + cellSize * 2.5, matrixY + cellSize * 3 + 6, { align: 'center' });
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('IMPACTO', matrixX + cellSize * 1.5, matrixY + cellSize * 3 + 13, { align: 'center' });
        
        // Labels do eixo Y (Probabilidade) - à esquerda da matriz
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.text('Alta', matrixX - 5, matrixY + cellSize * 0.5 + 2, { align: 'right' });
        doc.text('Média', matrixX - 5, matrixY + cellSize * 1.5 + 2, { align: 'right' });
        doc.text('Baixa', matrixX - 5, matrixY + cellSize * 2.5 + 2, { align: 'right' });
        
        // Título do eixo Y (vertical)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('P', matrixX - 18, matrixY + cellSize * 0.8);
        doc.text('R', matrixX - 18, matrixY + cellSize * 1.0);
        doc.text('O', matrixX - 18, matrixY + cellSize * 1.2);
        doc.text('B', matrixX - 18, matrixY + cellSize * 1.4);
        doc.text('A', matrixX - 18, matrixY + cellSize * 1.6);
        doc.text('B', matrixX - 18, matrixY + cellSize * 1.8);
        doc.text('.', matrixX - 18, matrixY + cellSize * 2.0);
        
        // Legenda de cores à direita da matriz
        const legendX = matrixX + cellSize * 3 + 15;
        const legendY = matrixY + 5;
        
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('Legenda:', legendX, legendY);
        
        doc.setFont(undefined, 'normal');
        
        // Risco Alto (vermelho)
        doc.setFillColor(231, 76, 60);
        doc.rect(legendX, legendY + 5, 8, 8, 'F');
        doc.setTextColor(60, 60, 60);
        doc.text('Risco Alto', legendX + 12, legendY + 11);
        
        // Risco Médio (laranja)
        doc.setFillColor(243, 156, 18);
        doc.rect(legendX, legendY + 17, 8, 8, 'F');
        doc.text('Risco Médio', legendX + 12, legendY + 23);
        
        // Risco Baixo (verde)
        doc.setFillColor(88, 214, 141);
        doc.rect(legendX, legendY + 29, 8, 8, 'F');
        doc.text('Risco Baixo', legendX + 12, legendY + 35);
        
        // Total de riscos
        doc.setFont(undefined, 'bold');
        doc.setTextColor(cores.vermelho[0], cores.vermelho[1], cores.vermelho[2]);
        doc.text(`Total: ${riscos.length} risco(s)`, legendX, legendY + 50);
        
        yPos = matrixY + cellSize * 3 + 20;
    }
    
    // =============================================
    // CABEÇALHO - Fundo branco com texto colorido
    // =============================================
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(cores.verde[0], cores.verde[1], cores.verde[2]);
    doc.text('TERMO DE INTENÇÃO DE PROJETO', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(cores.azul[0], cores.azul[1], cores.azul[2]);
    doc.text('TIP', pageWidth / 2, 25, { align: 'center' });
    
    // Número do TIP
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(cores.laranja[0], cores.laranja[1], cores.laranja[2]);
    doc.text(tip.numero_tip || 'Número Pendente', pageWidth / 2, 33, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(cores.verde[0], cores.verde[1], cores.verde[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);
    
    // Status badge
    const statusColors = { 
        'Rascunho': cores.cinza, 
        'Enviado Gestor': cores.azul, 
        'Enviado CTI': cores.laranja, 
        'Aprovado CTI': cores.verde, 
        'Reprovado CTI': cores.vermelho 
    };
    const statusColor = statusColors[tip.status] || cores.cinza;
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    const statusWidth = doc.getTextWidth(tip.status) + 12;
    doc.roundedRect((pageWidth - statusWidth) / 2, 42, statusWidth, 7, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(tip.status, pageWidth / 2, 47, { align: 'center' });
    
    yPos = 58;
    doc.setTextColor(0, 0, 0);
    
    // =============================================
    // INFORMAÇÕES BÁSICAS - Com campos coloridos
    // =============================================
    addSectionTitle('INFORMAÇÕES BÁSICAS', cores.verde);
    addFieldColored('Solicitante', tip.solicitante?.nome_completo, cores.verde);
    addFieldColored('Título da Proposta', tip.titulo, cores.azul);
    addFieldColored('Prazo de Execução', (tip.prazo_execucao || '-') + ' meses', cores.laranja);
    addFieldColored('Data de Criação', formatDate(tip.created_at), cores.verde);
    
    // =============================================
    // OBJETIVO - Texto justificado com barra lateral
    // =============================================
    addSectionTitle('OBJETIVO', cores.azul);
    addJustifiedTextWithBar(tip.objetivo, cores.azul);
    
    // =============================================
    // PROBLEMA/OPORTUNIDADE/JUSTIFICATIVA - Texto justificado com barra lateral
    // =============================================
    addSectionTitle('PROBLEMA / OPORTUNIDADE / JUSTIFICATIVA', cores.laranja);
    addJustifiedTextWithBar(tip.problema_oportunidade_justificativa, cores.laranja);
    
    // =============================================
    // ALINHAMENTO ESTRATÉGICO - Tabela padronizada
    // =============================================
    if (alinRes.data && alinRes.data.length > 0) {
        checkNewPage(30);
        addSectionTitle('ALINHAMENTO ESTRATÉGICO', cores.verde);
        doc.autoTable({
            startY: yPos,
            head: [['Portfolio', 'Desafio de Inovação', 'Compromisso']],
            body: alinRes.data.map(a => [
                a.portfolios?.nome || '-', 
                a.desafios_inovacao?.descricao || '-', 
                a.compromissos?.descricao || '-'
            ]),
            theme: 'grid',
            headStyles: { 
                fillColor: cores.verde, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // PRINCIPAIS RESULTADOS - Tabela padronizada
    // =============================================
    if (resRes.data && resRes.data.length > 0) {
        checkNewPage(30);
        addSectionTitle('PRINCIPAIS RESULTADOS', cores.azul);
        doc.autoTable({
            startY: yPos,
            head: [['Tipo', 'TRL', 'Descrição', 'Como Ajuda', 'Mês']],
            body: resRes.data.map(r => [
                r.tipos_resultado?.nome || '-', 
                r.trl || '-', 
                r.descricao || '-', 
                r.como_ajuda || '-',
                r.mes_previsao || '-'
            ]),
            theme: 'grid',
            headStyles: { 
                fillColor: cores.azul, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // COLABORADORES - Tabela padronizada
    // =============================================
    if (colRes.data && colRes.data.length > 0) {
        checkNewPage(25);
        addSectionTitle('COLABORADORES POTENCIAIS', cores.verde);
        doc.autoTable({
            startY: yPos,
            head: [['Nome do Colaborador', 'Responsabilidade Prevista']],
            body: colRes.data.map(c => [c.usuarios?.nome_completo || '-', c.responsabilidade || '-']),
            theme: 'grid',
            headStyles: { 
                fillColor: cores.verde, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // INSTITUIÇÕES PARCEIRAS - Tabela padronizada
    // =============================================
    if (instRes.data && instRes.data.length > 0) {
        checkNewPage(25);
        addSectionTitle('INSTITUIÇÕES PARCEIRAS', cores.laranja);
        doc.autoTable({
            startY: yPos,
            head: [['Instituição Parceira', 'Responsabilidade no Projeto']],
            body: instRes.data.map(i => [i.instituicoes_parceiras?.nome || '-', i.responsabilidade || '-']),
            theme: 'grid',
            headStyles: { 
                fillColor: cores.laranja, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // ORÇAMENTO - Tabela padronizada
    // =============================================
    if (orcRes.data && orcRes.data.length > 0) {
        checkNewPage(25);
        addSectionTitle('ORÇAMENTO E FONTES DE RECURSOS', cores.azul);
        
        // Calcular total
        const totalOrcamento = orcRes.data.reduce((sum, o) => sum + (parseFloat(o.valor_estimado) || 0), 0);
        
        doc.autoTable({
            startY: yPos,
            head: [['Fonte Financiadora', 'Valor Estimado (R$)', '%', 'Tem Edital?']],
            body: [
                ...orcRes.data.map(o => [
                    o.fontes_financiadoras?.nome || '-', 
                    formatMoney(o.valor_estimado), 
                    (o.percentual || '-') + '%', 
                    o.tem_edital ? 'Sim' : 'Não'
                ]),
                [
                    { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }, 
                    { content: formatMoney(totalOrcamento), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }, 
                    { content: '', styles: { fillColor: [230, 230, 230] } }, 
                    { content: '', styles: { fillColor: [230, 230, 230] } }
                ]
            ],
            theme: 'grid',
            headStyles: { 
                fillColor: cores.azul, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // RISCOS - Tabela + Matriz
    // =============================================
    if (riscRes.data && riscRes.data.length > 0) {
        checkNewPage(35);
        addSectionTitle('ANÁLISE DE RISCOS', cores.vermelho);
        
        doc.autoTable({
            startY: yPos,
            head: [['Descrição do Risco', 'Probabilidade', 'Impacto', 'Resposta']],
            body: riscRes.data.map(r => [
                r.descricao || '-',
                r.probabilidade || '-',
                r.impacto || '-',
                r.resposta || '-'
            ]),
            theme: 'grid',
            headStyles: { 
                fillColor: cores.vermelho, 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 3, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Desenhar matriz de riscos
        drawRiskMatrix(riscRes.data);
    }
    
    // =============================================
    // PÁGINA DE ANEXOS - Quebra de página obrigatória
    // =============================================
    const temParecer = tip.parecer_gestor || (isCTI && adhocRes.data && adhocRes.data.length > 0) || tip.parecer_cti || tip.motivo_reprovacao;
    const temHistorico = histRes.data && histRes.data.length > 0;
    
    if (temParecer || temHistorico) {
        addAnexosTitle();
    }
    
    // =============================================
    // PARECER DO GESTOR - Texto com barra lateral
    // =============================================
    if (tip.parecer_gestor) {
        addSectionTitle('PARECER DO GESTOR', cores.laranja);
        addJustifiedTextWithBar(tip.parecer_gestor, cores.laranja);
        
        // Informações adicionais do parecer
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Data do Parecer:  ${formatDateTime(tip.data_parecer_gestor)}`, margin, yPos);
        yPos += 5;
        
        if (tip.anuencia_gestor) {
            doc.setFillColor(cores.verde[0], cores.verde[1], cores.verde[2]);
            doc.roundedRect(margin, yPos - 3, 45, 6, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.text('ANUÊNCIA CONCEDIDA', margin + 2, yPos + 1);
            doc.setFont(undefined, 'normal');
        }
        yPos += 15;
    }
    
    // =============================================
    // PARECER DO AD HOC - Texto com barra lateral (apenas CTI)
    // =============================================
    if (isCTI && adhocRes.data && adhocRes.data.length > 0) {
        checkNewPage(40);
        addSectionTitle('PARECER AD HOC', cores.roxo);
        
        adhocRes.data.forEach((p, index) => {
            checkNewPage(35);
            
            // Nome do revisor
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(cores.roxo[0], cores.roxo[1], cores.roxo[2]);
            doc.text(`Revisor:  ${p.usuarios?.nome_completo || 'Ad Hoc'}`, margin, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            
            // Texto do parecer com barra lateral
            if (p.parecer) {
                addJustifiedTextWithBar(p.parecer, cores.roxo);
            } else {
                // Barra lateral com mensagem de aguardando
                doc.setFillColor(cores.roxo[0], cores.roxo[1], cores.roxo[2]);
                doc.rect(margin, yPos - 3, 3, 12, 'F');
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.text('Aguardando parecer...', margin + 8, yPos + 3);
                yPos += 15;
            }
            
            // Resultado e data
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            if (p.resultado) {
                const resultadoColor = p.resultado === 'Aprovada' ? cores.verde : cores.laranja;
                doc.setFillColor(resultadoColor[0], resultadoColor[1], resultadoColor[2]);
                doc.roundedRect(margin, yPos - 3, 50, 6, 1, 1, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.text(`Resultado: ${p.resultado}`, margin + 2, yPos + 1);
                
                if (p.data_parecer) {
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Data:  ${formatDateTime(p.data_parecer)}`, margin + 55, yPos + 1);
                }
            }
            yPos += 15;
        });
    }
    
    // =============================================
    // DECISÃO DO CTI - Texto com barra lateral
    // =============================================
    if (tip.parecer_cti || tip.motivo_reprovacao) {
        checkNewPage(40);
        const isAprovado = tip.status === 'Aprovado CTI';
        const corParecer = isAprovado ? cores.verde : cores.vermelho;
        const tituloDecisao = isAprovado ? 'DECISÃO DO CTI - APROVAÇÃO' : 'DECISÃO DO CTI - REPROVAÇÃO';
        
        addSectionTitle(tituloDecisao, corParecer);
        addJustifiedTextWithBar(tip.parecer_cti || tip.motivo_reprovacao, corParecer);
        
        // Data da decisão
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Data da Decisão:  ${formatDateTime(tip.data_aprovacao_cti || tip.data_reprovacao_cti)}`, margin, yPos);
        
        // Badge de status
        doc.setFillColor(corParecer[0], corParecer[1], corParecer[2]);
        const statusText = isAprovado ? 'APROVADO' : 'REPROVADO';
        const badgeWidth = doc.getTextWidth(statusText) + 8;
        doc.roundedRect(margin + 100, yPos - 4, badgeWidth, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text(statusText, margin + 104, yPos);
        doc.setFont(undefined, 'normal');
        
        yPos += 15;
    }
    
    // =============================================
    // HISTÓRICO - Tabela padronizada
    // =============================================
    if (histRes.data && histRes.data.length > 0) {
        checkNewPage(30);
        addSectionTitle('HISTÓRICO DE TRAMITAÇÃO', cores.cinza);
        doc.autoTable({
            startY: yPos,
            head: [['Data/Hora', 'Status', 'Localização', 'Usuário', 'Observação']],
            body: histRes.data.slice(0, 15).map(h => [
                formatDateTime(h.created_at), 
                h.status_novo || '-', 
                h.localizacao || '-', 
                h.usuarios?.nome_completo || 'Sistema',
                h.observacao ? (h.observacao.length > 40 ? h.observacao.substring(0, 40) + '...' : h.observacao) : '-'
            ]),
            theme: 'grid',
            headStyles: { 
                fillColor: [100, 100, 100], 
                textColor: [255, 255, 255], 
                fontSize: 7, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { fontSize: 6, textColor: [60, 60, 60], valign: 'middle' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: { cellPadding: 2, overflow: 'linebreak' }
        });
        yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // =============================================
    // RODAPÉ EM TODAS AS PÁGINAS
    // =============================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Linha do rodapé
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, 285, pageWidth - margin, 285);
        
        // Texto do rodapé
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Sistema TIP - Embrapa', margin, 290);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
        doc.text(`Gerado em: ${formatDateTime(new Date())}`, pageWidth - margin, 290, { align: 'right' });
    }
    
    // Salvar PDF
    doc.save(`TIP_${tip.numero_tip || tipId}_${formatDateFile(new Date())}.pdf`);
    showToast('PDF exportado com sucesso!', 'success');
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateFile(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function formatMoney(value) {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// =============================================
// MODAIS
// =============================================
function openModal() { document.getElementById('modal').classList.add('active'); }
function closeModal() { document.getElementById('modal').classList.remove('active'); }
function closeModalParecer() { document.getElementById('modalParecer').classList.remove('active'); }
function closeModalHistorico() { document.getElementById('modalHistorico').classList.remove('active'); }
function closeModalGestor() { document.getElementById('modalGestor').classList.remove('active'); }
function closeModalAdHoc() { document.getElementById('modalAdHoc').classList.remove('active'); }
function closeModalVisualizacao() { document.getElementById('modalVisualizacao').classList.remove('active'); }

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// =============================================
// FIM DO CÓDIGO
// =============================================
