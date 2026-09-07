from agno.eval import Case

search_agent_cases = [
    Case(
        name="search_complete_title", 
        agent="search_agent",
        input="Cerca l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model'.", 
        expected_tool_calls=["search_arxiv"], 
        criteria="L'agente deve cercare l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model' e restituire informazioni coerenti con il risultato della ricerca. Non deve inventare risultati.", 
        tags=["search", "exact_title"]
    ),
    Case(
        name="search_incomplete_title", 
        agent="search_agent",
        input="Cerca l'articolo 'Direct Preference Optimization...'.", 
        expected_tool_calls=["search_arxiv"], 
        criteria="L'agente deve identificare correttamente l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model'. Non deve inventare risultati.", 
        tags=["search", "partial_title"]
    ),
    Case(
        name="search_vague_query", 
        agent="search_agent",
        input="Cerca un articolo che parla di transformers.", 
        expected_tool_calls=["get_researcher_profile","search_arxiv"], 
        criteria="L'agente deve restituire un solo articolo scientifico pertinente ai Transformer nell'ambito dell'informatica. I risultati devono essere coerenti con la query e l'agente non deve inventare titoli, autori o contenuti.", 
        tags=["search", "vague_query"]
    ),
    Case(
        name="search_nonexistent_paper", 
        agent="search_agent",
        input="Cerca l'articolo 'Non-existent Paper Title'.", 
        expected_tool_calls=["search_arxiv"], 
        criteria="Poichè l'articolo non esiste, l'agente deve comunicarlo chiaramente e non deve inventare un articolo, autori, abstract o altri metadati.", 
        tags=["search", "negative_case"]
    ),
]

analysis_agent_cases = [
    Case(
        name="analysis_summary_complete_title", 
        agent="analysis_agent",
        input="Riassumi l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper"], 
        criteria="L'agente deve cercare l'articolo nella knowledge base personale dell'utente. Se l'articolo è disponibile, deve produrre un riassunto accurato e pertinente, descrivendo almeno obiettivo, metodologia e contributo principale. Non deve inventare informazioni non supportate dall'articolo.", 
        tags=["analysis", "summary", "exact_title"]
    ),
    Case(
        name="analysis_summary_incomplete_title", 
        agent="analysis_agent",
        input="Riassumi l'articolo 'Direct Preference Optimization...'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper"], 
        criteria="L'agente deve cercare nella knowledge base personale dell'utente utilizzando il titolo incompleto e identificare correttamente l'articolo richiesto. Deve poi produrre un riassunto coerente con il contenuto del documento, senza introdurre informazioni non supportate.", 
        tags=["analysis", "summary", "partial_title"]
    ),
    Case(
        name="analysis_info_request_paper", 
        agent="analysis_agent",
        input="Come si addestra un reward model con dati di preferenza umana?", 
        expected_tool_calls=["search_user_knowledge"], 
        criteria="L'agente deve cercare nei paper indicizzati dell'utente informazioni pertinenti alla domanda. Deve fornire una risposta basata esclusivamente sui contenuti dei paper dell'utente, senza inventare informazioni.", 
        tags=["analysis", "specific_question"]
    ),
    Case(
        name="analysis_compare_two_indexed_papers", 
        agent="analysis_agent",
        input="Confronta l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model' con l'articolo 'Fine-Tuning Language Models from Human Preferences'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper","search_user_paper_ids", "get_full_text_from_paper"], 
        criteria="L'agente deve cercare entrambi gli articoli nella knowledge base personale dell'utente. Se entrambi sono disponibili, deve fornire un confronto significativo tra i due lavori, evidenziando somiglianze e differenze rilevanti.", 
        tags=["analysis", "comparison", "multiple_papers"]
    ),
    Case(
        name="analysis_compare_missing_paper", 
        agent="analysis_agent",
        input="Confronta l'articolo 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model' con l'articolo 'Attention is All You Need'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper","search_user_paper_ids", "get_full_text_from_paper"], 
        criteria="L'agente deve cercare gli articoli nella knowledge base personale dell'utente. Se uno dei due articoli non è disponibile, deve comunicarlo chiaramente e non deve inventarne il contenuto. Non deve effettuare un confronto basandosi su informazioni non recuperate dalla knowledge base dell'utente.", 
        tags=["analysis", "comparison", "negative_case"]
    ),
]

simulation_agent_cases = [
    Case(
        name="simulation_extract_and_execute_code", 
        agent="simulation_agent",
        input="Estrai ed esegui il codice presente nell'articolo 'Direct Preference Optimization'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper", "get_runnable_functions", "run_code"], 
        criteria="L'agente deve estrarre il codice Python eseguibile dal'articolo e tentare di eseguirlo. La risposta deve riportare chiaramente il risultato dell'esecuzione. Se l'agente ha inventato i dati passati in argomento alla funzione rilevata, deve comunicarli.", 
        tags=["simulation", "code_extraction", "code_execution"]
    ),
    Case(
        name="simulation_paper_without_code", 
        agent="simulation_agent",
        input="Estrai ed esegui il codice presente nell'articolo 'Fine-Tuning Language Models from Human Preferences'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper", "get_runnable_functions"], 
        criteria="L'agente deve verificare la presenza di codice Python eseguibile. Poichè non è presente codice Python eseguibile, deve comunicarlo chiaramente e non deve inventare codice.", 
        tags=["simulation", "code_extraction", "negative_case"]
    ),
    Case(
        name="simulation_missing_dependencies", 
        agent="simulation_agent",
        input="Estrai ed esegui il codice presente nell'articolo 'A Simple Framework for Contrastive Learning of Visual Representations'.", 
        expected_tool_calls=["search_user_paper_ids", "get_full_text_from_paper", "get_runnable_functions", "run_code"], 
        criteria="L'agente deve identificare l'articolo, estrarre il codice Python eseguibile e tentare di eseguirlo. L'esecuzione non andrà a buon fine a causa di dipendenze mancanti, dunque l'agente deve comunicare l'errore e la sua causa.", 
        tags=["simulation", "code_execution", "error_handling"]
    ),
]