async function carregarProdutos() {
    const lista = document.getElementById("listaProdutos");

    lista.innerHTML = "<p>Carregando produtos...</p>";

    const { data: produtos, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Erro ao carregar produtos:", error);
        lista.innerHTML = "<p>Erro ao carregar os produtos.</p>";
        return;
    }

    if (!produtos || produtos.length === 0) {
        lista.innerHTML = "<p>Nenhum tecido cadastrado.</p>";
        return;
    }

    lista.innerHTML = "";

    produtos.forEach(produto => {

        const card = document.createElement("div");
        card.className = "produto-admin";

        const status = produto.disponivel
            ? '<span class="status disponivel">● Disponível</span>'
            : '<span class="status indisponivel">● Indisponível</span>';

        const foto = produto.foto_principal
            ? `<img src="${produto.foto_principal}" alt="${produto.nome}">`
            : `<div class="sem-foto">Sem foto</div>`;

        card.innerHTML = `
            <div class="produto-foto">
                ${foto}
            </div>

            <div class="produto-info">

                <div class="produto-topo">
                    <div>
                        <h3>${produto.nome}</h3>
                        <p>${produto.categoria || ""}</p>
                    </div>

                    ${status}
                </div>

                <div class="produto-estoque">
                    <span>Metragem disponível</span>
                    <strong>${produto.metragem ?? 0} metros</strong>
                </div>

                <div class="produto-acoes">
                    <button
    class="btn-foto"
    onclick="selecionarFoto(${produto.id})"
>
    📷 Trocar foto
</button>

                    <button
    class="btn-editar"
    onclick="abrirEdicao(${produto.id})"
>
    ✏️ Editar
</button>

                    <button
                        class="btn-status"
                        onclick="alterarDisponibilidade(
                            ${produto.id},
                            ${produto.disponivel}
                        )"
                    >
                        ${produto.disponivel
                            ? "Deixar indisponível"
                            : "Deixar disponível"}
                    </button>
                </div>

            </div>
        `;

        lista.appendChild(card);
    });
}


async function alterarDisponibilidade(id, statusAtual) {

    const { error } = await supabaseClient
        .from("produtos")
        .update({
            disponivel: !statusAtual
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Não foi possível alterar a disponibilidade.");
        return;
    }

    carregarProdutos();
    
}
// =========================================
// EDITAR PRODUTO
// =========================================

async function abrirEdicao(id) {

    const { data: produto, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error(error);
        alert("Erro ao carregar o tecido.");
        return;
    }

    document.getElementById("editarId").value = produto.id;
    document.getElementById("editarNome").value = produto.nome || "";
    document.getElementById("editarCategoria").value = produto.categoria || "";
    document.getElementById("editarDescricao").value = produto.descricao || "";
    document.getElementById("editarMetragem").value = produto.metragem ?? 0;
    document.getElementById("editarMercadoLivre").value =
        produto.link_mercado_livre || "";

    document.getElementById("modalEditar").classList.add("ativo");
}


function fecharEdicao() {
    document.getElementById("modalEditar").classList.remove("ativo");
}


async function salvarEdicao() {

    const id = document.getElementById("editarId").value;

    const nome = document.getElementById("editarNome").value.trim();
    const categoria = document.getElementById("editarCategoria").value.trim();
    const descricao = document.getElementById("editarDescricao").value.trim();

    const metragem =
        parseFloat(document.getElementById("editarMetragem").value);

    const linkMercadoLivre =
        document.getElementById("editarMercadoLivre").value.trim();


    if (!nome) {
        alert("Digite o nome do tecido.");
        return;
    }

    if (isNaN(metragem) || metragem < 0) {
        alert("Digite uma metragem válida.");
        return;
    }


    const { error } = await supabaseClient
        .from("produtos")
        .update({
            nome: nome,
            categoria: categoria,
            descricao: descricao,
            metragem: metragem,
            link_mercado_livre: linkMercadoLivre
        })
        .eq("id", id);


    if (error) {
        console.error(error);
        alert("Não foi possível salvar as alterações.");
        return;
    }


    fecharEdicao();

    carregarProdutos();

}

// =========================================
// TROCAR FOTO DO PRODUTO
// =========================================

function selecionarFoto(idProduto) {

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";

    input.addEventListener("change", function () {

        const arquivo = input.files[0];

        if (!arquivo) {
            return;
        }

        enviarFoto(idProduto, arquivo);
    });

    input.click();
}


async function enviarFoto(idProduto, arquivo) {

    try {

        // Limite de 8 MB
        if (arquivo.size > 8 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 8 MB.");
            return;
        }


        const extensao =
            arquivo.name.split(".").pop().toLowerCase();

        const nomeArquivo =
            `produto-${idProduto}-${Date.now()}.${extensao}`;


        // ENVIA PARA O STORAGE

        const { data: upload, error: erroUpload } =
            await supabaseClient.storage
                .from("produtos")
                .upload(nomeArquivo, arquivo, {
                    cacheControl: "3600",
                    upsert: false
                });


        if (erroUpload) {
            console.error("Erro no upload:", erroUpload);

            alert(
                "Não foi possível enviar a imagem."
            );

            return;
        }


        // PEGA A URL PÚBLICA

        const { data: urlData } =
            supabaseClient.storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);


        const urlFoto = urlData.publicUrl;


        // SALVA A URL NO PRODUTO

        const { error: erroProduto } =
            await supabaseClient
                .from("produtos")
                .update({
                    foto_principal: urlFoto
                })
                .eq("id", idProduto);


        if (erroProduto) {

            console.error(
                "Erro ao atualizar produto:",
                erroProduto
            );

            alert(
                "A foto foi enviada, mas não foi possível atualizar o produto."
            );

            return;
        }


        alert("Foto alterada com sucesso!");

        carregarProdutos();


    } catch (erro) {

        console.error(erro);

        alert("Ocorreu um erro ao trocar a foto.");
    }
}

function abrirNovoProduto() {

    document.getElementById("modalNovo")
        .classList.add("ativo");

}


function fecharNovoProduto() {

    document.getElementById("modalNovo")
        .classList.remove("ativo");

}


document
    .getElementById("btnNovoProduto")
    .addEventListener("click", abrirNovoProduto);

    async function cadastrarNovoProduto() {

    const nome = document.getElementById("novoNome").value.trim();
    const categoria = document.getElementById("novaCategoria").value;
    const descricao = document.getElementById("novaDescricao").value.trim();
    const metragem = parseFloat(
        document.getElementById("novaMetragem").value
    );

    const linkMercadoLivre = document
        .getElementById("novoMercadoLivre")
        .value
        .trim();


    // VALIDAÇÕES
    if (!nome) {
        alert("Digite o nome do tecido.");
        return;
    }

    if (!categoria) {
        alert("Selecione uma categoria.");
        return;
    }

    if (isNaN(metragem) || metragem < 0) {
        alert("Digite uma metragem válida.");
        return;
    }


    /*
        PROCURA OS PRODUTOS DA MESMA CATEGORIA

        Exemplo:
        tricoline-01
        tricoline-02
        tricoline-03
    */

    const { data: produtosCategoria, error: erroBusca } =
        await supabaseClient
            .from("produtos")
            .select("codigo")
            .like("codigo", categoria + "-%");


    if (erroBusca) {
        console.error(erroBusca);
        alert("Não foi possível verificar os produtos existentes.");
        return;
    }


    /*
        DESCOBRE O MAIOR NÚMERO JÁ UTILIZADO
    */

    let maiorNumero = 0;

    produtosCategoria.forEach(produto => {

        if (!produto.codigo) return;

        const partes = produto.codigo.split("-");
        const numero = parseInt(partes[partes.length - 1]);

        if (!isNaN(numero) && numero > maiorNumero) {
            maiorNumero = numero;
        }

    });


    /*
        CRIA O PRÓXIMO CÓDIGO

        jeans-03 → jeans-04
        tricoline-01 → tricoline-02
    */

    const proximoNumero = maiorNumero + 1;

    const codigo =
        categoria +
        "-" +
        String(proximoNumero).padStart(2, "0");


    /*
        DEIXA O NOME DA CATEGORIA BONITO
        PARA SALVAR NO BANCO
    */

    const seletorCategoria =
        document.getElementById("novaCategoria");

    const nomeCategoria =
        seletorCategoria.options[
            seletorCategoria.selectedIndex
        ].text;


    /*
        CADASTRA NO SUPABASE
    */

    const { data: novoProduto, error: erroCadastro } =
        await supabaseClient
            .from("produtos")
            .insert({
                codigo: codigo,
                nome: nome,
                categoria: nomeCategoria,
                descricao: descricao,
                metragem: metragem,
                disponivel: true,
                link_mercado_livre: linkMercadoLivre || null
            })
            .select()
            .single();


    if (erroCadastro) {

        console.error(
            "Erro ao cadastrar produto:",
            erroCadastro
        );

        alert("Não foi possível cadastrar o tecido.");

        return;
    }


    console.log(
        "Novo produto cadastrado:",
        novoProduto
    );


    /*
        LIMPA O FORMULÁRIO
    */

    document.getElementById("novoNome").value = "";
    document.getElementById("novaCategoria").value = "";
    document.getElementById("novaDescricao").value = "";
    document.getElementById("novaMetragem").value = "0";
    document.getElementById("novoMercadoLivre").value = "";


    fecharNovoProduto();

    await carregarProdutos();

    alert(
        "Tecido cadastrado com sucesso!\nCódigo: " +
        codigo
    );
}