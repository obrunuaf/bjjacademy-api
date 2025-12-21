-- =====================================================
-- 019-seed-pendencias-variadas.sql
-- Dados de teste com DATAS DIFERENTES para testar filtros
-- =====================================================

DO $$
DECLARE
    v_academia_id UUID;
    v_turma_id UUID;
    v_aula_id UUID;
    v_aluno_id UUID;
    i INTEGER;
BEGIN
    -- Pegar primeira academia
    SELECT id INTO v_academia_id FROM academias LIMIT 1;
    
    IF v_academia_id IS NULL THEN
        RAISE NOTICE 'Nenhuma academia encontrada.';
        RETURN;
    END IF;

    -- Pegar primeira turma
    SELECT id INTO v_turma_id FROM turmas WHERE academia_id = v_academia_id LIMIT 1;
    
    IF v_turma_id IS NULL THEN
        RAISE NOTICE 'Nenhuma turma encontrada.';
        RETURN;
    END IF;

    -- Pegar um aluno
    SELECT u.id INTO v_aluno_id FROM usuarios u LIMIT 1;

    -- Criar aulas e pendências para os últimos 15 dias
    FOR i IN 0..14 LOOP
        -- Criar aula para cada dia
        INSERT INTO aulas (id, academia_id, turma_id, data_inicio, data_fim, status)
        VALUES (
            gen_random_uuid(),
            v_academia_id,
            v_turma_id,
            (NOW() - (i || ' days')::interval)::date + TIME '19:00:00',
            (NOW() - (i || ' days')::interval)::date + TIME '20:30:00',
            CASE WHEN i = 0 THEN 'AGENDADA' ELSE 'ENCERRADA' END
        )
        RETURNING id INTO v_aula_id;

        -- Criar pendência para cada dia  
        INSERT INTO presencas (
            id,
            academia_id,
            aula_id,
            aluno_id,
            status,
            origem
        ) VALUES (
            gen_random_uuid(),
            v_academia_id,
            v_aula_id,
            v_aluno_id,
            'PENDENTE',
            CASE 
                WHEN i % 3 = 0 THEN 'QR_CODE'
                WHEN i % 3 = 1 THEN 'MANUAL'
                ELSE 'SISTEMA'
            END
        );
        
        RAISE NOTICE 'Criada pendência para dia: %', (NOW() - (i || ' days')::interval)::date;
    END LOOP;

    RAISE NOTICE 'Criadas 15 pendências com datas variadas!';
END $$;

-- Verificar pendências por data
SELECT 
    p.id,
    u.nome_completo as aluno_nome,
    p.origem,
    a.data_inicio::date as data_aula,
    CASE 
        WHEN a.data_inicio::date = CURRENT_DATE THEN 'HOJE'
        WHEN a.data_inicio::date >= CURRENT_DATE - INTERVAL '7 days' THEN 'SEMANA'
        ELSE 'ANTIGO'
    END as periodo
FROM presencas p
JOIN usuarios u ON u.id = p.aluno_id
JOIN aulas a ON a.id = p.aula_id
WHERE p.status = 'PENDENTE'
ORDER BY a.data_inicio DESC;
