/*
 * Converted from Java to idiomatic Kotlin for Vets#getVetList()
 */
@XmlRootElement
class Vets {
    @get:XmlElement
    val vetList: List<Vet> = Vet.vets.also { it.initialize() }
}