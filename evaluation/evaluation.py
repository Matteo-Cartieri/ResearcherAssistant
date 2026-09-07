import json
from agno.agent import RunOutput
from agno.eval.agent_as_judge import AgentAsJudgeEval
from agno.eval.reliability import ReliabilityEval

def run_test_cases(agent, test_cases, user_id, judge_model, scoring_threshold, output_file):
    results = []
    for test_case in test_cases:
        try:
            response: RunOutput = agent.run(
                test_case.input,
                user_id=user_id,
            )

            reliability_result = ReliabilityEval(
                agent_response=response,
                expected_tool_calls=test_case.expected_tool_calls,
            ).run()

            judge_result = AgentAsJudgeEval(
                model=judge_model,
                criteria=test_case.criteria,
                scoring_strategy="numeric",
                threshold=scoring_threshold,
            ).run(
                input=test_case.input,
                output=str(response.content),
            )

            results.append({
                "name": test_case.name,
                "agent": test_case.agent,
                "user_id": user_id,
                "input": test_case.input,
                "output": str(response.content),
                "expected_tool_calls": test_case.expected_tool_calls,
                "called_tools": [tool.tool_name for tool in (response.tools or [])],
                "tags": test_case.tags,
                "reliability": {"passed_tool_calls": reliability_result.passed_tool_calls, "missing_tool_calls": reliability_result.missing_tool_calls},
                "judge": {"score": judge_result.results[0].score, "passed": judge_result.results[0].passed, "reason": judge_result.results[0].reason},
            })
        except Exception as e:
            results.append( {
                "name": test_case.name,
                "agent": test_case.agent,
                "user_id": user_id,
                "input": test_case.input,
                "tags": test_case.tags,
                "error": str(e),
            })

    save_results(results, output_file)
    return results

def save_results(results, output_file):
    with open(output_file, "a") as f:
        for result in results:
            f.write(json.dumps(result) + "\n")
