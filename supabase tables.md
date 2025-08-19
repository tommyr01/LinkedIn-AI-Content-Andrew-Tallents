### connection_posts

| column                 | type      | null |
|-------------------------|-----------|------|
| id                      | text      | no   |
| connection_id           | text      | no   |
| post_urn                | text      | no   |
| author_first_name       | text      | yes  |
| author_headline         | text      | yes  |
| author_last_name        | text      | yes  |
| author_linkedin_url     | text      | yes  |
| author_profile_picture  | text      | yes  |
| celebrate               | numeric   | yes  |
| comments_count          | numeric   | yes  |
| created_at              | timestamp | yes  |
| full_urn                | text      | yes  |
| insight                 | numeric   | yes  |
| likes                   | numeric   | yes  |
| love                    | numeric   | yes  |
| media_thumbnail         | text      | yes  |
| media_type              | text      | yes  |
| media_url               | text      | yes  |
| post_text               | text      | yes  |
| post_type               | text      | yes  |
| post_url                | text      | yes  |
| posted_date             | text      | yes  |
| relative_posted         | text      | yes  |
| reposts                 | numeric   | yes  |
| support                 | numeric   | yes  |
| total_reactions         | numeric   | yes  |
| username                | text      | yes  |

---

### content_drafts

| column         | type    | null |
|----------------|---------|------|
| id             | text    | no   |
| job_id         | text    | no   |
| agent_name     | text    | no   |
| content        | json    | no   |
| metadata       | json    | yes  |
| score          | numeric | yes  |
| variant_number | numeric | no   |
| created_at     | timestamp | yes |

---

### content_jobs

| column          | type      | null |
|-----------------|-----------|------|
| id              | text      | no   |
| topic           | text      | no   |
| status          | text      | no   |
| queue_job_id    | text      | yes  |
| platform        | text      | yes  |
| research_data   | json      | yes  |
| progress        | numeric   | yes  |
| completed_at    | timestamp | yes  |
| created_at      | timestamp | yes  |
| updated_at      | timestamp | yes  |
| error           | text      | yes  |
| voice_guide_id  | text      | yes  |

---

### linkedin_comments

| column                    | type      | null |
|---------------------------|-----------|------|
| id                        | text      | no   |
| comment_id                | text      | no   |
| post_urn                  | text      | no   |
| text                      | text      | yes  |
| replies                   | json      | yes  |
| total_reactions           | numeric   | yes  |
| comments_count            | numeric   | yes  |
| replies_count             | numeric   | yes  |
| appreciation_reactions    | numeric   | yes  |
| empathy_reactions         | numeric   | yes  |
| interest_reactions        | numeric   | yes  |
| praise_reactions          | numeric   | yes  |
| like_reactions            | numeric   | yes  |
| posted_at                 | text      | yes  |
| author_name               | text      | yes  |
| author_headline           | text      | yes  |
| author_profile_picture    | text      | yes  |
| author_profile_url        | text      | yes  |
| icp_breakdown             | json      | yes  |
| icp_category              | text      | yes  |
| icp_reasoning             | text[]    | yes  |
| icp_score                 | numeric   | yes  |
| icp_tags                  | text[]    | yes  |
| is_edited                 | boolean   | yes  |
| is_pinned                 | boolean   | yes  |
| profile_researched        | boolean   | yes  |
| research_completed_at     | text      | yes  |
| created_at                | timestamp | yes  |
| updated_at                | text      | yes  |
| comment_url               | text      | yes  |

---

### linkedin_connections

| column                 | type      | null |
|------------------------|-----------|------|
| id                     | text      | no   |
| full_name              | text      | no   |
| first_name             | text      | yes  |
| last_name              | text      | yes  |
| headline               | text      | yes  |
| about                  | text      | yes  |
| hashtags               | text      | yes  |
| profile_picture_url    | text      | yes  |
| current_company        | text      | yes  |
| title                  | text      | yes  |
| connection_count       | numeric   | yes  |
| follower_count         | numeric   | yes  |
| is_creator             | boolean   | yes  |
| is_influencer          | boolean   | yes  |
| is_premium             | boolean   | yes  |
| is_current             | boolean   | yes  |
| start_date             | text      | yes  |
| duration               | text      | yes  |
| background_picture_url | text      | yes  |
| company_linkedin_url   | text      | yes  |
| company_location       | text      | yes  |
| full_location          | text      | yes  |
| show_follower_count    | boolean   | yes  |
| created_at             | timestamp | yes  |
| updated_at             | timestamp | yes  |
| last_synced_at         | timestamp | yes  |
| urn                    | text      | yes  |
| username               | text      | yes  |

---

### linkedin_posts

| column               | type      | null |
|----------------------|-----------|------|
| urn                  | text      | no   |
| id                   | text      | no   |
| author_first_name    | text      | yes  |
| author_last_name     | text      | yes  |
| author_username      | text      | yes  |
| author_headline      | text      | yes  |
| author_profile_picture | text    | yes  |
| author_profile_url   | text      | yes  |
| text                 | text      | yes  |
| document_url         | text      | yes  |
| document_thumbnail   | text      | yes  |
| document_title       | text      | yes  |
| document_page_count  | numeric   | yes  |
| celebrate_count      | numeric   | yes  |
| comments_count       | numeric   | yes  |
| like_count           | numeric   | yes  |
| love_count           | numeric   | yes  |
| insight_count        | numeric   | yes  |
| reposts_count        | numeric   | yes  |
| support_count        | numeric   | yes  |
| total_reactions      | numeric   | yes  |
| post_type            | text      | yes  |
| posted_at            | text      | yes  |
| created_at           | timestamp | yes  |
| updated_at           | timestamp | yes  |
| last_synced_at       | timestamp | yes  |
| url                  | text      | yes  |
| full_urn             | text      | yes  |

---

### linkedin_profiles

| column                    | type      | null |
|---------------------------|-----------|------|
| id                        | text      | no   |
| profile_url               | text      | no   |
| name                      | text      | yes  |
| headline                  | text      | yes  |
| current_company           | text      | yes  |
| current_role              | text      | yes  |
| current_role_start_date   | text      | yes  |
| connection_count          | numeric   | yes  |
| follower_count            | numeric   | yes  |
| icp_score                 | numeric   | yes  |
| icp_category              | text      | yes  |
| icp_breakdown             | json      | yes  |
| icp_reasoning             | text[]    | yes  |
| icp_tags                  | text[]    | yes  |
| is_connection_target      | boolean   | yes  |
| is_creator                | boolean   | yes  |
| is_influencer             | boolean   | yes  |
| location                  | text      | yes  |
| added_to_connections_at   | timestamp | yes  |
| last_researched_at        | timestamp | yes  |
| profile_picture           | text      | yes  |
| full_profile_data         | json      | yes  |
| research_source           | text      | yes  |
| connection_status         | text      | yes  |
| created_at                | timestamp | yes  |
| updated_at                | timestamp | yes  |
| username                  | text      | yes  |

---

### post_embeddings

| column                | type      | null |
|-----------------------|-----------|------|
| id                    | serial    | no   |
| post_id               | text      | no   |
| content               | text      | no   |
| embedding             | text      | yes  |
| engagement_score      | numeric   | yes  |
| authority_signals     | text[]    | yes  |
| performance_tier      | text      | yes  |
| comments_count        | numeric   | yes  |
| like_count            | numeric   | yes  |
| word_count            | numeric   | yes  |
| shares_count          | numeric   | yes  |
| reposts_count         | numeric   | yes  |
| total_reactions       | numeric   | yes  |
| has_call_to_action    | boolean   | yes  |
| has_data_points       | boolean   | yes  |
| has_question          | boolean   | yes  |
| has_story             | boolean   | yes  |
| vulnerability_score   | numeric   | yes  |
| posted_date           | text      | yes  |
| created_at            | timestamp | yes  |
| updated_at            | timestamp | yes  |

---

### post_engagement_history

| column            | type      | null |
|-------------------|-----------|------|
| id                | text      | no   |
| post_urn          | text      | no   |
| recorded_at       | timestamp | yes  |
| celebrate_count   | numeric   | yes  |
| comments_count    | numeric   | yes  |
| insight_count     | numeric   | yes  |
| like_count        | numeric   | yes  |
| love_count        | numeric   | yes  |
| reposts_count     | numeric   | yes  |
| support_count     | numeric   | yes  |
| total_reactions   | numeric   | yes  |

---

### research_cache

| column            | type      | null |
|-------------------|-----------|------|
| id                | text      | no   |
| query_hash        | text      | no   |
| query_text        | text      | no   |
| results           | json      | no   |
| source            | text      | no   |
| expires_at        | timestamp | no   |
| hit_count         | numeric   | yes  |
| created_at        | timestamp | yes  |
| last_accessed_at  | timestamp | yes  |
