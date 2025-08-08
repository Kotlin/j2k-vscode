import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.Repository
import org.springframework.transaction.annotation.Transactional

interface VetRepository : Repository<Vet, Int> {

    @Transactional(readOnly = true)
    @Cacheable("vets")
    fun findAll(): Collection<Vet>

    @Transactional(readOnly = true)
    @Cacheable("vets")
    fun findAll(pageable: Pageable): Page<Vet>
}