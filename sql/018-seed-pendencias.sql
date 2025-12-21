-- =====================================================
-- 018-seed-pendencias.sql
-- Dados de teste para tela de Solicitações/Pendências
-- =====================================================

DO $$
DECLARE
    v_academia_id UUID;
    v_turma_id UUID;
    v_aula_id UUID;
    v_aluno_ids UUID[];
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

    -- Pegar IDs de usuários (alunos)
    SELECT ARRAY_AGG(u.id) INTO v_aluno_ids 
    FROM usuarios u
    JOIN usuarios_papeis up ON up.usuario_id = u.id
    WHERE up.academia_id = v_academia_id 
    AND up.papel = 'ALUNO'
    LIMIT 10;

    -- Se não encontrou alunos, pegar qualquer usuário
    IF v_aluno_ids IS NULL OR array_length(v_aluno_ids, 1) = 0 THEN
        SELECT ARRAY_AGG(id) INTO v_aluno_ids FROM usuarios LIMIT 5;
    END IF;

    IF v_aluno_ids IS NULL OR array_length(v_aluno_ids, 1) = 0 THEN
        RAISE NOTICE 'Nenhum usuário encontrado.';
        RETURN;
    END IF;

    -- Criar aula para hoje
    INSERT INTO aulas (id, academia_id, turma_id, data_inicio, data_fim, status)
    VALUES (
        gen_random_uuid(),
        v_academia_id,
        v_turma_id,
        NOW()::date + TIME '18:00:00',
        NOW()::date + TIME '19:30:00',
        'AGENDADA'
    )
    RETURNING id INTO v_aula_id;

    RAISE NOTICE 'Aula criada: %', v_aula_id;

    -- Criar pendências de teste com diferentes origens
    FOR i IN 1..array_length(v_aluno_ids, 1) LOOP
        v_aluno_id := v_aluno_ids[i];
        
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
    END LOOP;

    -- Criar algumas pendências de dias anteriores (inserindo em outra aula)
    FOR i IN 1..3 LOOP
        v_aluno_id := v_aluno_ids[1];
        
        -- Criar aula de dias anteriores
        INSERT INTO aulas (id, academia_id, turma_id, data_inicio, data_fim, status)
        VALUES (
            gen_random_uuid(),
            v_academia_id,
            v_turma_id,
            (NOW() - (i || ' days')::interval)::date + TIME '18:00:00',
            (NOW() - (i || ' days')::interval)::date + TIME '19:30:00',
            'ENCERRADA'
        )
        RETURNING id INTO v_aula_id;
        
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
            'QR_CODE'
        );
    END LOOP;

    RAISE NOTICE 'Criadas pendências de teste com sucesso!';
END $$;

-- Verificar pendências criadas
SELECT 
    p.id,
    u.nome_completo as aluno_nome,
    p.origem,
    p.status,
    a.data_inicio,
    p.criado_em
FROM presencas p
JOIN usuarios u ON u.id = p.aluno_id
JOIN aulas a ON a.id = p.aula_id
WHERE p.status = 'PENDENTE'
ORDER BY p.criado_em DESC;
